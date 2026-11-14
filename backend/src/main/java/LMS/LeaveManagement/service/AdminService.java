package LMS.LeaveManagement.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import LMS.LeaveManagement.entity.LeaveRequest;
import LMS.LeaveManagement.repository.LeaveRequestRepository;

@Service
@Transactional
public class AdminService {

    private final LeaveRequestRepository leaveRepository;

    public AdminService(LeaveRequestRepository leaveRepository) {
        this.leaveRepository = leaveRepository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllLeaves() {
        return leaveRepository.findAll().stream()
            .sorted((a, b) -> b.getId().compareTo(a.getId()))
            .map(leave -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", leave.getId());
                map.put("employeeId", leave.getUser() != null ? leave.getUser().getId() : null);
                map.put("employeeName", leave.getUser() != null ? leave.getUser().getName() : "Unknown");
                map.put("employeeEmail", leave.getUser() != null ? leave.getUser().getEmail() : "Unknown");
                map.put("leaveType", leave.getLeaveType());
                map.put("fromDate", leave.getFromDate());
                map.put("toDate", leave.getToDate());
                map.put("reason", leave.getReason());
                map.put("status", leave.getStatus());
                map.put("assignedAdmin", leave.getAssignedAdmin() != null ? leave.getAssignedAdmin() : "All Admins");
                map.put("sharedWith", leave.getSharedWith() != null ? leave.getSharedWith() : "");
                map.put("createdAt", leave.getCreatedAt() != null ? leave.getCreatedAt().toString() : "");
                return map;
            })
            .collect(Collectors.toList());
    }

    public Map<String, Object> updateLeaveStatus(Long id, String newStatus) {
        if (newStatus == null || 
            (!newStatus.equalsIgnoreCase("APPROVED") && !newStatus.equalsIgnoreCase("REJECTED"))) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Status must be either APPROVED or REJECTED");
        }

        LeaveRequest leave = leaveRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Leave request not found with id: " + id));

        leave.setStatus(newStatus.toUpperCase());
        leaveRepository.save(leave);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Leave request #" + id + " has been " + newStatus.toUpperCase());
        response.put("id", leave.getId());
        response.put("status", leave.getStatus());
        return response;
    }
}
