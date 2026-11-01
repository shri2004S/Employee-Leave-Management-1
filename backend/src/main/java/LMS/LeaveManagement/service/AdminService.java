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
public class AdminService {

    private final LeaveRequestRepository leaveRepository;

    public AdminService(LeaveRequestRepository leaveRepository) {
        this.leaveRepository = leaveRepository;
    }

    public List<Map<String, Object>> getAllLeaves() {
        return leaveRepository.findAll().stream()
            .sorted((a, b) -> b.getId().compareTo(a.getId()))
            .map(leave -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", leave.getId());
                map.put("employeeId", leave.getUser().getId());
                map.put("employeeName", leave.getUser().getName());
                map.put("employeeEmail", leave.getUser().getEmail());
                map.put("leaveType", leave.getLeaveType());
                map.put("fromDate", leave.getFromDate());
                map.put("toDate", leave.getToDate());
                map.put("reason", leave.getReason());
                map.put("status", leave.getStatus());
                map.put("createdAt", leave.getCreatedAt() != null ? leave.getCreatedAt().toString() : "");
                return map;
            })
            .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> updateLeaveStatus(Long id, String newStatus) {
        if (newStatus == null || 
            (!newStatus.equalsIgnoreCase("APPROVED") && !newStatus.equalsIgnoreCase("REJECTED"))) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Status must be either APPROVED or REJECTED");
        }

        LeaveRequest leave = leaveRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Leave request with ID " + id + " not found"));

        if (!"PENDING".equalsIgnoreCase(leave.getStatus())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, 
                "Cannot change status. Leave request is already " + leave.getStatus());
        }

        leave.setStatus(newStatus.toUpperCase());
        LeaveRequest saved = leaveRepository.save(leave);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Leave request has been " + saved.getStatus().toLowerCase());
        response.put("id", saved.getId());
        response.put("status", saved.getStatus());
        response.put("employeeName", saved.getUser().getName());
        return response;
    }
}

