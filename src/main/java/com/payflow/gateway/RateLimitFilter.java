package com.payflow.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.payflow.redis.RateLimiterService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * Enforces "10 payments per minute per user" on payment endpoints.
 * Runs AFTER JwtAuthFilter so SecurityContext has the authenticated user.
 * Anonymous requests skip rate-limit here (Spring Security will 401 them anyway).
 */
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        // Only protect payment endpoints. Login/registration get their own
        // protections (and rate-limiting them by user wouldn't make sense -- pre-auth).
        String path = request.getRequestURI();
        if (!path.startsWith("/api/payments")) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserDetails ud)) {
            filterChain.doFilter(request, response);
            return;
        }

        String bucket = "payments:" + ud.getUsername();
        if (!rateLimiterService.tryAcquire(bucket)) {
            response.setStatus(429); // HTTP 429 Too Many Requests (no SC_ constant in Jakarta)
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getOutputStream(), Map.of(
                    "error", "RATE_LIMITED",
                    "message", "Too many payment requests. Try again in a minute."
            ));
            return;
        }

        filterChain.doFilter(request, response);
    }
}
