package LMS.LeaveManagement.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaWebController {

    @GetMapping(value = {
        "/",
        "/{path:^(?!api|assets|error|static|favicon\\.ico)[^\\.]*}",
        "/{path:^(?!api|assets|error|static|favicon\\.ico)[^\\.]*}/**"
    })
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}

