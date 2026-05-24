package com.jackshiao.financial.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import lombok.RequiredArgsConstructor;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    /**
     * ECPay 回呼端點使用 web.ignoring()，請求完全繞過所有 Spring Security FilterChain
     * （包含 CORS、CSRF、JwtAuthFilter），與 permitAll() 不同。
     *
     * - /api/payment/ecpay/notify：ECPay 伺服器端回呼（Server Push）。
     *   已實作 CheckMacValue 驗簽，由驗簽機制確保請求來源合法性。
     *
     * - /api/payment/ecpay/return：ECPay 付款完成後瀏覽器端導向（Browser Redirect）。
     *   【注意】此端點目前未驗簽，任何人均可直接呼叫。
     *   請勿在此端點執行任何訂單狀態變更，業務邏輯應以 notify 為準。
     */
    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring()
                .requestMatchers("/api/payment/ecpay/return")
                .requestMatchers("/api/payment/ecpay/notify");
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // 公開端點：認證、市場指數（唯讀）、訂閱方案列表
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/market/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/subscription/plans").permitAll()
                // 受保護端點：追蹤清單、會員資料、投資組合、訂閱需登入
                .requestMatchers("/api/watchlist/**").authenticated()
                .requestMatchers("/api/member/**").authenticated()
                .requestMatchers("/api/portfolio/**").authenticated()
                .requestMatchers("/api/subscription/**").authenticated()
                // 其他端點預設需要認證
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

        // 一般 API：只允許前端 localhost（payment/** 由獨立 FilterChain 處理，不在此設定）
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        source.registerCorsConfiguration("/api/**", config);

        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
