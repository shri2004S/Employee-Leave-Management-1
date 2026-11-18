package LMS.LeaveManagement.service;

import LMS.LeaveManagement.entity.LeaveRequest;
import LMS.LeaveManagement.entity.User;
import LMS.LeaveManagement.repository.LeaveRequestRepository;
import LMS.LeaveManagement.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
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
public class LeaveServiceTest {

    @Mock
    private LeaveRequestRepository leaveRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    private LeaveService leaveService;

    private User employee;

    @BeforeEach
    void setUp() {
        leaveService = new LeaveService(leaveRepository, userRepository);

        employee = new User();
        employee.setId(10L);
        employee.setName("John Doe");
        employee.setEmail("john@settribe.com");
        employee.setRole("EMPLOYEE");
    }

    @Test
    @DisplayName("Should successfully apply for leave with valid details")
    void testApplyLeaveSuccess() {
        when(authentication.getName()).thenReturn("john@settribe.com");
        when(userRepository.findByEmail("john@settribe.com")).thenReturn(Optional.of(employee));
        when(leaveRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> {
            LeaveRequest req = inv.getArgument(0);
            req.setId(101L);
            return req;
        });

        LeaveRequest request = new LeaveRequest();
        request.setLeaveType("CASUAL");
        request.setFromDate(LocalDate.now().plusDays(2));
        request.setToDate(LocalDate.now().plusDays(5));
        request.setReason("Attending a family gathering");
        request.setAssignedAdmin("Manideep Sir (manideep@gmail.com)");

        LeaveRequest result = leaveService.applyForLeave(request, authentication);

        assertThat(result.getId()).isEqualTo(101L);
        assertThat(result.getStatus()).isEqualTo("PENDING");
        assertThat(result.getUser().getEmail()).isEqualTo("john@settribe.com");
        assertThat(result.getAssignedAdmin()).isEqualTo("Manideep Sir (manideep@gmail.com)");
        assertThat(result.getSharedWith()).isEqualTo("Manideep Sir (manideep@gmail.com)");
        verify(leaveRepository, times(1)).save(any(LeaveRequest.class));
    }

    @Test
    @DisplayName("Should reject leave application when start date is in the past")
    void testApplyLeavePastDate() {
        LeaveRequest request = new LeaveRequest();
        request.setLeaveType("CASUAL");
        request.setFromDate(LocalDate.now().minusDays(2));
        request.setToDate(LocalDate.now().plusDays(2));
        request.setReason("Urgent personal reason");

        assertThatThrownBy(() -> leaveService.applyForLeave(request, authentication))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Start date cannot be in the past");
    }

    @Test
    @DisplayName("Should reject leave application when end date is before start date")
    void testApplyLeaveInvertedDates() {
        LeaveRequest request = new LeaveRequest();
        request.setLeaveType("SICK");
        request.setFromDate(LocalDate.now().plusDays(5));
        request.setToDate(LocalDate.now().plusDays(2));
        request.setReason("Medical appointment");

        assertThatThrownBy(() -> leaveService.applyForLeave(request, authentication))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("End date cannot be before start date");
    }

    @Test
    @DisplayName("Should retrieve only the authenticated employee's leave requests")
    void testGetMyLeaves() {
        when(authentication.getName()).thenReturn("john@settribe.com");
        when(userRepository.findByEmail("john@settribe.com")).thenReturn(Optional.of(employee));

        LeaveRequest req1 = new LeaveRequest();
        req1.setId(1L);
        req1.setUser(employee);
        req1.setStatus("PENDING");

        LeaveRequest req2 = new LeaveRequest();
        req2.setId(2L);
        req2.setUser(employee);
        req2.setStatus("APPROVED");

        when(leaveRepository.findByUserId(10L)).thenReturn(List.of(req1, req2));

        List<LeaveRequest> list = leaveService.getMyLeaves(authentication);

        assertThat(list).hasSize(2);
        assertThat(list.get(0).getId()).isEqualTo(1L);
        assertThat(list.get(1).getId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("Should update an existing pending leave request successfully")
    void testUpdatePendingLeaveSuccess() {
        when(authentication.getName()).thenReturn("john@settribe.com");
        when(userRepository.findByEmail("john@settribe.com")).thenReturn(Optional.of(employee));

        LeaveRequest existing = new LeaveRequest();
        existing.setId(50L);
        existing.setUser(employee);
        existing.setLeaveType("CASUAL");
        existing.setFromDate(LocalDate.now().plusDays(3));
        existing.setToDate(LocalDate.now().plusDays(5));
        existing.setReason("Initial reason");
        existing.setStatus("PENDING");

        when(leaveRepository.findById(50L)).thenReturn(Optional.of(existing));
        when(leaveRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequest updateData = new LeaveRequest();
        updateData.setLeaveType("SICK");
        updateData.setFromDate(LocalDate.now().plusDays(4));
        updateData.setToDate(LocalDate.now().plusDays(6));
        updateData.setReason("Updated medical reason");
        updateData.setAssignedAdmin("Sushil Sir (sushil@gmail.com)");

        LeaveRequest updated = leaveService.updateLeave(50L, updateData, authentication);

        assertThat(updated.getLeaveType()).isEqualTo("SICK");
        assertThat(updated.getReason()).isEqualTo("Updated medical reason");
        assertThat(updated.getAssignedAdmin()).isEqualTo("Sushil Sir (sushil@gmail.com)");
        verify(leaveRepository, times(1)).save(existing);
    }

    @Test
    @DisplayName("Should prevent updating an already APPROVED leave request")
    void testPreventUpdateApprovedLeave() {
        when(authentication.getName()).thenReturn("john@settribe.com");
        when(userRepository.findByEmail("john@settribe.com")).thenReturn(Optional.of(employee));

        LeaveRequest existing = new LeaveRequest();
        existing.setId(60L);
        existing.setUser(employee);
        existing.setStatus("APPROVED");

        when(leaveRepository.findById(60L)).thenReturn(Optional.of(existing));

        LeaveRequest updateData = new LeaveRequest();
        updateData.setLeaveType("CASUAL");
        updateData.setFromDate(LocalDate.now().plusDays(1));
        updateData.setToDate(LocalDate.now().plusDays(2));
        updateData.setReason("Trying to change approved leave");

        assertThatThrownBy(() -> leaveService.updateLeave(60L, updateData, authentication))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Only PENDING requests can be edited");
    }

    @Test
    @DisplayName("Should prevent updating another employee's leave request")
    void testPreventUnauthorizedUpdate() {
        when(authentication.getName()).thenReturn("john@settribe.com");
        when(userRepository.findByEmail("john@settribe.com")).thenReturn(Optional.of(employee));

        User otherEmployee = new User();
        otherEmployee.setId(99L);
        otherEmployee.setEmail("other@settribe.com");

        LeaveRequest otherLeave = new LeaveRequest();
        otherLeave.setId(70L);
        otherLeave.setUser(otherEmployee);
        otherLeave.setStatus("PENDING");

        when(leaveRepository.findById(70L)).thenReturn(Optional.of(otherLeave));

        LeaveRequest updateData = new LeaveRequest();

        assertThatThrownBy(() -> leaveService.updateLeave(70L, updateData, authentication))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("not authorized to update another employee's leave");
    }

    @Test
    @DisplayName("Should delete/cancel a pending leave request")
    void testCancelPendingLeaveSuccess() {
        when(authentication.getName()).thenReturn("john@settribe.com");
        when(userRepository.findByEmail("john@settribe.com")).thenReturn(Optional.of(employee));

        LeaveRequest existing = new LeaveRequest();
        existing.setId(80L);
        existing.setUser(employee);
        existing.setStatus("PENDING");

        when(leaveRepository.findById(80L)).thenReturn(Optional.of(existing));

        leaveService.deleteLeave(80L, authentication);

        verify(leaveRepository, times(1)).delete(existing);
    }
}
