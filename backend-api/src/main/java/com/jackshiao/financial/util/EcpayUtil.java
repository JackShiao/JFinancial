package com.jackshiao.financial.util;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import java.util.TreeMap;

/**
 * ECPay 綠界金流工具類
 *
 * <p>CheckMacValue 演算法說明（依綠界官方規格書）：
 * <ol>
 *   <li>將所有參數（除 CheckMacValue 本身外）依參數名稱字母升序排列</li>
 *   <li>拼接成 HashKey=值&param1=值1&...&HashIV=值 的字串</li>
 *   <li>對整段字串進行 URL Encode（.NET UrlEncode 規則：空格→+，其他特殊字元→%XX）</li>
 *   <li>全部轉小寫</li>
 *   <li>計算 SHA256 雜湊值，並轉大寫</li>
 * </ol>
 */
public final class EcpayUtil {

    private EcpayUtil() {
        // 工具類，禁止實例化
    }

    /**
     * 產生 ECPay CheckMacValue
     *
     * @param params  所有 ECPay 參數（不含 CheckMacValue 本身）
     * @param hashKey ECPay HashKey
     * @param hashIv  ECPay HashIV
     * @return 大寫 SHA256 字串
     */
    public static String buildCheckMacValue(Map<String, String> params, String hashKey, String hashIv) {
        // 1. 依 key 字母排序（TreeMap 預設就是字母升序）
        TreeMap<String, String> sortedParams = new TreeMap<>(params);

        // 2. 拼接 HashKey=...&...&HashIV=...
        StringBuilder raw = new StringBuilder();
        raw.append("HashKey=").append(hashKey).append("&");
        sortedParams.forEach((k, v) -> raw.append(k).append("=").append(v).append("&"));
        raw.append("HashIV=").append(hashIv);

        // 3. URL Encode（.NET 規則）再轉小寫
        String encoded = dotNetUrlEncode(raw.toString()).toLowerCase();

        // 4. SHA256 → 大寫
        return sha256Upper(encoded);
    }

    /**
     * 模擬 .NET HttpUtility.UrlEncode 行為：
     * - 空格 → +
     * - 英數字與 -_.!*()~ 不轉換（.NET 不編碼這些字元，Java URLEncoder 會編碼 ! ( ) ~）
     * - 其他字元 → %XX
     */
    private static String dotNetUrlEncode(String input) {
        try {
            String encoded = URLEncoder.encode(input, StandardCharsets.UTF_8);
            // 補正 Java 與 .NET 的差異：.NET 不編碼 ! ( ) ~，但 Java 會
            encoded = encoded
                    .replace("%21", "!")
                    .replace("%28", "(")
                    .replace("%29", ")")
                    .replace("%7E", "~");
            return encoded;
        } catch (Exception e) {
            throw new IllegalStateException("URL encode 失敗", e);
        }
    }

    private static String sha256Upper(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02X", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 不支援", e);
        }
    }
}
