
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    RecaptchaVerifier,
    linkWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    doc, updateDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const phoneForm = document.getElementById("phoneForm");
const otpForm = document.getElementById("otpForm");
const message = document.getElementById("message");

let verifier;
let confirmationResult;
let studentUser = null;
let verifiedPhone = "";

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    studentUser = user;

    if (user.phoneNumber) {
        message.textContent =
            "Mobile number already verified: " + user.phoneNumber;
        phoneForm.hidden = true;
        return;
    }

    try {
        verifier = new RecaptchaVerifier(
            auth,
            "recaptcha-container",
            { size: "normal" }
        );

        await verifier.render();
    } catch (error) {
        console.error(error);
        message.textContent = "Could not initialize reCAPTCHA.";
    }
});

phoneForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const phone = document.getElementById("phone").value.trim();

    if (!/^[6-9]\d{9}$/.test(phone)) {
        message.textContent = "Enter a valid 10-digit Indian mobile number.";
        return;
    }

    if (!studentUser || !verifier) {
        message.textContent = "Please log in and try again.";
        return;
    }

    const button = document.getElementById("sendBtn");
    button.disabled = true;

    try {
        verifiedPhone = "+91" + phone;
        message.textContent = "Requesting OTP...";

        confirmationResult = await linkWithPhoneNumber(
            studentUser,
            verifiedPhone,
            verifier
        );

        otpForm.hidden = false;
        phoneForm.hidden = true;
        message.textContent =
            "OTP requested. Check your SMS (or use your Firebase test code).";

    } catch (error) {
        console.error(error);
        message.textContent =
            "Unable to send OTP: " + error.code;
        button.disabled = false;
        verifiedPhone = "";

        if (verifier) {
            verifier.clear();
            verifier = null;
        }

        document.getElementById("recaptcha-container")
            .replaceChildren();

        verifier = new RecaptchaVerifier(
            auth, "recaptcha-container", { size: "normal" }
        );

        await verifier.render();
    }
});

otpForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!confirmationResult) return;

    const code = document.getElementById("otp").value.trim();

    if (!/^\d{6}$/.test(code)) {
        message.textContent = "Enter the 6-digit OTP.";
        return;
    }

    const button = otpForm.querySelector("button");
    button.disabled = true;

    try {
        const result = await confirmationResult.confirm(code);

        message.textContent = "✅ Mobile number verified!";
        otpForm.hidden = true;

        // Optional profile synchronization.
        // Requires Firestore update permission.
        try {
            await updateDoc(
                doc(db, "students", result.user.uid),
                { phoneNumber: verifiedPhone }
            );
        } catch (profileError) {
            console.warn("Profile sync skipped:", profileError);
        }

    } catch (error) {
        console.error(error);
        message.textContent =
            "Incorrect or expired OTP. Please try again.";
        button.disabled = false;
    }
});
