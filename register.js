
import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const form = document.getElementById("registerForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const student = {
        name: document.getElementById("name").value.trim(),
        laundryId: document.getElementById("laundryId").value.trim(), email: document.getElementById("email").value.trim(),
        hostel: document.getElementById("hostel").value,
        roomType: document.getElementById("roomType").value,
        block: document.getElementById("block").value.trim(),
        room: document.getElementById("room").value.trim()
    };

    const password = document.getElementById("password").value;
    const button = form.querySelector('button[type="submit"]');

    button.disabled = true;
    message.textContent = "Creating your account...";

    try {
        // Create account with Firebase Authentication
        const credential = await createUserWithEmailAndPassword(
            auth,
            student.email,
            password
        );

        // Store profile using Firebase UID, not password
        await setDoc(
            doc(db, "students", credential.user.uid),
            {
                ...student,
                uid: credential.user.uid,
                role: "student",
                createdAt: new Date().toISOString()
            }
        );

        message.textContent =
            "Registration successful! Please log in.";

        await auth.signOut();

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1200);

    } catch (error) {
        console.error(error);

        if (error.code === "auth/email-already-in-use") {
            message.textContent = "Email already registered.";
        } else if (error.code === "auth/weak-password") {
            message.textContent = "Choose a stronger password.";
        } else if (error.code === "permission-denied") {
            message.textContent =
                "Firestore permission denied. Check database rules.";
        } else {
            message.textContent =
                "Registration error: " + error.message;
        }
    } finally {
        button.disabled = false;
    }
});
