package LMS.LeaveManagement.service;

import LMS.LeaveManagement.entity.LeaveRequest;
import LMS.LeaveManagement.entity.User;
import LMS.LeaveManagement.repository.LeaveRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AdminServiceTest {

    @Mock
    private LeaveRequestRepository leaveRepository;

    private AdminService adminService;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(leaveRepository);
    }

    @Test
    @DisplayName("Should return all leaves sorted by ID descending with approver details")
    void testGetAllLeaves() {
        User u = new User();
        u.setId(10L);
        u.setName("John Doe");
        u.setEmail("john@settribe.com");

        LeaveRequest r1 = new LeaveRequest();
        r1.setId(1L);
        r1.setUser(u);
        r1.setStatus("PENDING");
        r1.setAssignedAdmin("Manideep Sir (manideep@gmail.com)");
        r1.setSharedWith("Manideep Sir (manideep@gmail.com)");

        LeaveRequest r2 = new LeaveRequest();
        r2.setId(2L);
        r2.setUser(u);
        r2.setStatus("APPROVED");
        r2.setAssignedAdmin("Sushil Sir (sushil@gmail.com)");

        when(leaveRepository.findAll()).thenReturn(List.of(r1, r2));

        List<Map<String, Object>> result = adminService.getAllLeaves();

        assertThat(result).hasSize(2);
        // Sorted by ID descending: r2 (id: 2) comes first
        assertThat(result.get(0).get("id")).isEqualTo(2L);
        assertThat(result.get(0).get("assignedAdmin")).isEqualTo("Sushil Sir (sushil@gmail.com)");
        assertThat(result.get(1).get("id")).isEqualTo(1L);
        assertThat(result.get(1).get("assignedAdmin")).isEqualTo("Manideep Sir (manideep@gmail.com)");
    }

    @Test
    @DisplayName("Should approve a pending leave request")
    void testApproveLeave() {
        LeaveRequest req = new LeaveRequest();
        req.setId(10L);
        req.setStatus("PENDING");

        when(leaveRepository.findById(10L)).thenReturn(Optional.of(req));
        when(leaveRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> res = adminService.updateLeaveStatus(10L, "APPROVED");

        assertThat(res.get("status")).isEqualTo("APPROVED");
        assertThat(req.getStatus()).isEqualTo("APPROVED");
        verify(leaveRepository, times(1)).save(req);
    }

    @Test
    @DisplayName("Should reject a pending leave request")
    void testRejectLeave() {
        LeaveRequest req = new LeaveRequest();
        req.setId(20L);
        req.setStatus("PENDING");

        when(leaveRepository.findById(20L)).thenReturn(Optional.of(req));
        when(leaveRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> res = adminService.updateLeaveStatus(20L, "REJECTED");

        assertThat(res.get("status")).isEqualTo("REJECTED");
        assertThat(req.getStatus()).isEqualTo("REJECTED");
        verify(leaveRepository, times(1)).save(req);
    }

    @Test
    @DisplayName("Should throw BAD_REQUEST for unsupported status values")
    void testInvalidStatusUpdate() {
        assertThatThrownBy(() -> adminService.updateLeaveStatus(10L, "CANCELLED"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Status must be either APPROVED or REJECTED");

        assertThatThrownBy(() -> adminService.updateLeaveStatus(10L, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Status must be either APPROVED or REJECTED");
    }

    @Test
    @DisplayName("Should throw NOT_FOUND when updating non-existent leave ID")
    void testLeaveNotFound() {
        when(leaveRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.updateLeaveStatus(999L, "APPROVED"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Leave request not found");
    }
}
