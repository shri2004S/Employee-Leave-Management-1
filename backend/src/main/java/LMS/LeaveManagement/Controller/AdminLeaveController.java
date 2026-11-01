package LMS.LeaveManagement.Controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import LMS.LeaveManagement.service.AdminService;

@RestController
@RequestMapping("/api/admin/leaves")
public class AdminLeaveController {

    private final AdminService adminService;

    public AdminLeaveController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllLeaves() {
        return ResponseEntity.ok(adminService.getAllLeaves());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateLeaveStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {

        String status = request.get("status");
        return ResponseEntity.ok(adminService.updateLeaveStatus(id, status));
    }
}

