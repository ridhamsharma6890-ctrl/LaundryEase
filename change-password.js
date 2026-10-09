
import { auth } from "./firebase-config.js";

import {
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const form = document.getElementById("changeForm");
const message = document.getElementById("message");

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
    }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;

    if (!user || !user.email) {
        message.textContent = "Please log in again.";
        return;
    }

    const current = document.getElementById(
        "currentPassword"
    ).value;

    const newPassword = document.getElementById(
        "newPassword"
    ).value;

    const confirmPassword = document.getElementById(
        "confirmPassword"
    ).value;

    if (newPassword.length < 8) {
        message.textContent =
            "Use at least 8 characters.";
        return;
    }

    if (newPassword !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        return;
    }

    const button = form.querySelector("button");
    button.disabled = true;

    try {
        const credential = EmailAuthProvider.credential(
            user.email, current
        );

        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);

        message.textContent = "Password updated successfully!";
        form.reset();

    } catch (error) {
        console.error(error);
        message.textContent =
            "Password update failed. Check your current " +
            "password and try again.";
    } finally {
        button.disabled = false;
    }
});
