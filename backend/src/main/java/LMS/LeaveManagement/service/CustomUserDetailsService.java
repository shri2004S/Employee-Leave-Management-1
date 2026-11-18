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
import java.util.Set;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private static final Set<String> OFFICIAL_ADMIN_EMAILS = Set.of(
            "manideep@gmail.com", "manideepsir@gmail.com",
            "sushil@gmail.com", "sushilsir@gmail.com",
            "gaurav@gmail.com", "gauravsir@gmail.com"
    );

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    private boolean isOfficialAdmin(String email) {
        return email != null && OFFICIAL_ADMIN_EMAILS.contains(email.trim().toLowerCase());
    }

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        String cleanEmail = email != null ? email.trim().toLowerCase() : "";
        User user = userRepository.findByEmail(cleanEmail)
                .or(() -> userRepository.findByEmail(email))
                .orElse(null);

        // Auto-provision official admin if missing in cloud database
        if (user == null && isOfficialAdmin(cleanEmail)) {
            user = new User();
            user.setEmail(cleanEmail);
            user.setName(cleanEmail.contains("manideep") ? "Manideep Sir"
                    : cleanEmail.contains("sushil") ? "Sushil Sir" : "Gaurav Sir");
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

        // Self-heal role in database to ADMIN for official project admins
        if (adminUser && !"ADMIN".equalsIgnoreCase(user.getRole())) {
            user.setRole("ADMIN");
            try {
                userRepository.saveAndFlush(user);
            } catch (Exception ignored) {
            }
        }

        String rawRole = adminUser ? "ADMIN" : (user.getRole() != null ? user.getRole().trim().toUpperCase() : "EMPLOYEE");
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
