
package LMS.LeaveManagement.repository;

import LMS.LeaveManagement.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LeaveRequestRepository
        extends JpaRepository<LeaveRequest, Long> {

    List<LeaveRequest> findByUserId(Long userId);

    List<LeaveRequest> findByStatus(String status);

    List<LeaveRequest> findByUserIdAndStatus(
            Long userId, String status);
}
