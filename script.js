
function selectRole(role) {
    if (role === "student") {
        window.location.href = "login.html";
    } else if (role === "staff") {
        window.location.href = "staff-login.html";
    } else if (role === "admin") {
        window.location.href = "admin-dashboard.html";
    }
}
