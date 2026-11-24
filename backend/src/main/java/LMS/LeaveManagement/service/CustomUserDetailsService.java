package LMS.LeaveManagement.service;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import LMS.LeaveManagement.entity.User;
import LMS.LeaveManagement.repository.UserRepository;

import java.util.ArrayList;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    private static final java.util.Set<String> OFFICIAL_ADMIN_EMAILS = java.util.Set.of(
            "shri1@gmail.com",
            "shri@gmail.com",
            "superadmin@gmail.com",
            "admin@settribe.com",
            "manideep@gmail.com",
            "sushil@gmail.com",
            "gaurav@gmail.com");

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    private boolean isOfficialAdmin(String email) {
        if (email == null)
            return false;
        return OFFICIAL_ADMIN_EMAILS.contains(email.trim().toLowerCase());
    }

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        String cleanEmail = email != null ? email.trim().toLowerCase() : "";
        User user = userRepository.findByEmail(cleanEmail)
                .or(() -> userRepository.findByEmail(email))
                .orElse(null);

        // Auto-provision official admin if missing in Neon database
        if (user == null && isOfficialAdmin(cleanEmail)) {
            user = new User();
            user.setEmail(cleanEmail);
            user.setName(cleanEmail.contains("superadmin") ? "Super Admin"
                    : cleanEmail.contains("manideep") ? "Manideep Sir"
                            : cleanEmail.contains("sushil") ? "Sushil Sir"
                                    : cleanEmail.contains("gaurav") ? "Gaurav Sir" : "Shri (Admin)");
            user.setRole("ADMIN");
            user.setPassword("$2a$10$baN/1DaM95ALzvOHcy6FPeXLvk.sZXXHwciSnSNAaeOfi666iaGI6");
            try {
                user = userRepository.saveAndFlush(user);
            } catch (Exception ignored) {
            }
        }

        if (user == null) {
            throw new UsernameNotFoundException("User not found: " + email);
        }

        boolean adminUser = isOfficialAdmin(cleanEmail) || isOfficialAdmin(user.getEmail());

        if (adminUser && !"ADMIN".equalsIgnoreCase(user.getRole())) {
            user.setRole("ADMIN");
            try {
                userRepository.saveAndFlush(user);
            } catch (Exception ignored) {
            }
        }

        String rawRole = adminUser ? "ADMIN"
                : (user.getRole() != null ? user.getRole().trim().toUpperCase() : "EMPLOYEE");
        String cleanRole = rawRole.startsWith("ROLE_") ? rawRole.substring(5) : rawRole;

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + cleanRole));
        authorities.add(new SimpleGrantedAuthority(cleanRole));

        if (adminUser) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
            authorities.add(new SimpleGrantedAuthority("ADMIN"));
        }

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities(authorities)
                .build();
    }
}
