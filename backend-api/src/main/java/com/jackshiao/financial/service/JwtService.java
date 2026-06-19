package com.jackshiao.financial.service;

import java.util.Date;
import java.util.List;
import java.util.Set;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretString;

    @Value("${jwt.expiration-ms}")
    private long expirationMs;

    private SecretKey secretKey;

    @PostConstruct
    private void init() {
        if (secretString == null || secretString.isBlank() || secretString.startsWith("PLACEHOLDER")) {
            throw new IllegalStateException(
                "jwt.secret 尚未設定！請在 application-local.properties 填入正式的 secret key。"
            );
        }
        if (secretString.getBytes().length < 32) {
            throw new IllegalStateException(
                "jwt.secret 長度不足（需 >= 32 bytes），請使用更長的隨機字串。"
            );
        }
        secretKey = Keys.hmacShaKeyFor(secretString.getBytes());
    }

    public String generateToken(String email, String displayName, Set<String> roles) {
        return Jwts.builder()
                .subject(email)
                .claim("roles", roles)
                .claim("displayName", displayName)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(secretKey)
                .compact();
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        Object roles = parseClaims(token).get("roles");
        if (roles instanceof List<?> list) {
            return list.stream()
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .toList();
        }
        return List.of();
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = parseClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
