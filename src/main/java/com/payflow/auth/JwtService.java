package com.payflow.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

/**
 * Signs and verifies JWTs. We embed userId and role as custom claims so the
 * JwtAuthFilter can authorize requests without hitting the database.
 */
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long defaultExpirationMs;
    private final long rememberMeExpirationMs;

    public JwtService(
            @Value("${payflow.jwt.secret}") String secret,
            @Value("${payflow.jwt.expiration-ms}") long defaultExpirationMs,
            @Value("${payflow.jwt.remember-me-expiration-ms}") long rememberMeExpirationMs
    ) {
        // HMAC-SHA key needs >= 256 bits. Use the raw secret bytes (long enough per config).
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.defaultExpirationMs = defaultExpirationMs;
        this.rememberMeExpirationMs = rememberMeExpirationMs;
    }

    public String generateToken(Long userId, String email, String role) {
        return generateToken(userId, email, role, false);
    }

    /**
     * @param rememberMe if true, token lives for ~24h instead of ~1h.
     */
    public String generateToken(Long userId, String email, String role, boolean rememberMe) {
        long ttl = rememberMe ? rememberMeExpirationMs : defaultExpirationMs;
        Date now = new Date();
        Date expiry = new Date(now.getTime() + ttl);
        return Jwts.builder()
                .subject(email)
                .claim("uid", userId)
                .claim("role", role)
                .claim("rememberMe", rememberMe)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Long extractUserId(String token) {
        Object uid = extractAllClaims(token).get("uid");
        if (uid instanceof Number n) return n.longValue();
        return null;
    }

    public String extractRole(String token) {
        Object role = extractAllClaims(token).get("role");
        return role == null ? null : role.toString();
    }

    public boolean isValid(String token, String expectedEmail) {
        try {
            Claims claims = extractAllClaims(token);
            return claims.getSubject().equals(expectedEmail)
                    && claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    private <T> T extractClaim(String token, Function<Claims, T> resolver) {
        return resolver.apply(extractAllClaims(token));
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
