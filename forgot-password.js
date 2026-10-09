
import { auth } from "./firebase-config.js";

import {
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const form = document.getElementById("resetForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email")
        .value.trim();

    const button = form.querySelector("button");
    button.disabled = true;

    message.textContent = "Sending request...";

    try {
        await sendPasswordResetEmail(auth, email);

        message.textContent =
            "If an account exists for this email, " +
            "a password reset link will be sent. " +
            "Check your inbox and spam folder.";

    } catch (error) {
        console.error(error);

        message.textContent =
            "Unable to send reset email. " +
            "Please check your connection and try again.";
    } finally {
        button.disabled = false;
    }
});
