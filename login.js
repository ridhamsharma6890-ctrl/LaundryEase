
import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  doc, getDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    message.textContent = "Logging in...";

    const credential = await signInWithEmailAndPassword(
      auth, email, password
    );

    const snapshot = await getDoc(
      doc(db, "students", credential.user.uid)
    );

    if (!snapshot.exists()) {
      await auth.signOut();
      message.textContent = "Student profile not found.";
      return;
    }

    const student = snapshot.data();

    if (student.role !== "student") {
      await auth.signOut();
      message.textContent = "Not a student account.";
      return;
    }

    sessionStorage.setItem(
      "laundryStudentId", student.laundryId
    );

    window.location.href = "student-dashboard.html";

  } catch (error) {
    console.error(error);
    message.textContent =
      "Login failed. Check your email and password.";
  }
});
