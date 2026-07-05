package com.jackshiao.financial.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;

/**
 * RSS 代理端點：前端無法直接跨域抓取 Google News RSS，
 * 透過後端代理轉發請求並回傳 XML 內容。
 */
@RestController
@RequestMapping("/api/news")
public class NewsProxyController {

    private static final Set<String> ALLOWED_HOSTS = Set.of(
            "news.google.com"
    );

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @GetMapping("/rss")
    public ResponseEntity<String> proxyRss(@RequestParam("url") String rssUrl) {
        // 白名單驗證：只允許 Google News 的 RSS URL
        try {
            URI uri = URI.create(rssUrl);
            if (uri.getHost() == null || !ALLOWED_HOSTS.contains(uri.getHost())) {
                return ResponseEntity.badRequest()
                        .body("Only Google News RSS URLs are allowed");
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid URL");
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(rssUrl))
                    .timeout(Duration.ofSeconds(15))
                    .header("User-Agent", "Mozilla/5.0 (compatible; JFinancial/1.0)")
                    .GET()
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request,
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return ResponseEntity.status(response.statusCode())
                        .body("Upstream returned " + response.statusCode());
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_XML)
                    .body(response.body());

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Failed to fetch RSS: " + e.getMessage());
        }
    }
}
