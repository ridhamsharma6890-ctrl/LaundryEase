
import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const form = document.getElementById("staffLoginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("staffEmail").value.trim();
    const password =
        document.getElementById("staffPassword").value;

    message.textContent = "Checking staff credentials...";

    try {
        const result = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const staffRef = doc(db, "staff", result.user.uid);
        const staffSnap = await getDoc(staffRef);

        if (!staffSnap.exists()) {
            await signOut(auth);
            message.textContent =
                "Staff account not found in Firestore.";
            return;
        }

        const staff = staffSnap.data();

        if (staff.role !== "staff" || staff.active !== true) {
            await signOut(auth);
            message.textContent = "Staff access denied.";
            return;
        }

        message.textContent = "Login successful!";

        window.location.href = "staff-dashboard.html";

    }
    catch (error) {
        console.error("Staff Login Error:", error);

        message.textContent =
            "Firebase Error: " +
            (error.code || error.message);
    }

});
