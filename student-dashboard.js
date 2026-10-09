
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// LaundryEase - Student Dashboard

const MAX_CLOTHES = 10;

let student = null;
let currentUser = null;
let myOrders = [];
let unsubscribeOrders = null;

const form = document.getElementById("laundryForm");
const clothInputs = document.querySelectorAll(".cloth-item");
const totalDisplay = document.getElementById("totalClothes");
const limitMessage = document.getElementById("limitMessage");
const bookingMessage = document.getElementById("bookingMessage");
const bookBtn = document.getElementById("bookBtn");

// Human-readable clothing names
const clothingNames = {
    trousers: "Trousers",
    shirts: "Shirts",
    tshirts: "T-Shirts",
    jeans: "Jeans",
    shorts: "Shorts",
    socks: "Socks (Pairs)",
    personalBedsheets: "Personal Bedsheets",
    collegeBedsheets: "College Bedsheets",
    personalTowels: "Personal Towels",
    collegeTowels: "College Towels",
    personalPillow: "Personal Pillow Covers",
    collegePillow: "College Pillow Covers",
    other: "Other Clothes"
};

// STEP A: Calculate clothing quantities
function getClothingDetails() {
    const clothes = {};
    let total = 0;

    clothInputs.forEach(input => {
        const quantity = Number(input.value);

        if (
            input.value.trim() === "" ||
            !Number.isInteger(quantity) ||
            quantity < 0 ||
            quantity > MAX_CLOTHES
        ) {
            throw new Error(
                "Every clothing quantity must be between 0 and 10."
            );
        }

        clothes[input.dataset.type] = quantity;
        total += quantity;
    });

    return { clothes, total };
}

// STEP B: Display the total
function updateClothTotal() {
    try {
        const { total } = getClothingDetails();

        totalDisplay.textContent = total;

        if (total > MAX_CLOTHES) {
            limitMessage.textContent =
                "Maximum 10 laundry items allowed!";
            limitMessage.style.color = "red";
            bookBtn.disabled = true;
        } else {
            limitMessage.textContent =
                `${MAX_CLOTHES - total} items remaining`;
            limitMessage.style.color = "green";
            bookBtn.disabled = total === 0;
        }

    } catch (error) {
        limitMessage.textContent = error.message;
        limitMessage.style.color = "red";
        bookBtn.disabled = true;
    }
}

clothInputs.forEach(input => {
    input.addEventListener("input", updateClothTotal);
});

// STEP C: Firebase student login
onAuthStateChanged(auth, async user => {
    if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = null;
    }

    if (!user) {
        window.location.replace("login.html");
        return;
    }

    currentUser = user;

    try {
        const profile = await getDoc(
            doc(db, "students", user.uid)
        );

        if (!profile.exists() ||
            profile.data().role !== "student") {
            await signOut(auth);
            return;
        }

        student = profile.data();

        document.getElementById("welcome").textContent =
            "Welcome, " + student.name + "!";

        document.getElementById("studentDetails").textContent =
            "Laundry ID: " + student.laundryId +
            " | " + student.hostel + " Hostel" +
            " | " + student.roomType +
            " | Block " + student.block +
            " | Room " + student.room;

        document.getElementById("schedule").textContent =
            student.hostel === "Boys"
                ? "Submit Tuesday | Collect Friday"
                : "Submit Wednesday | Collect Saturday";

        // Listen for changes to this student's orders
        const ordersQuery = query(
            collection(db, "laundryOrders"),
            where("studentUid", "==", user.uid)
        );

        unsubscribeOrders = onSnapshot(
            ordersQuery,
            snapshot => {
                myOrders = snapshot.docs.map(document => ({
                    id: document.id,
                    ...document.data()
                }));

                displayOrders();
            },
            error => {
                console.error(error);
                bookingMessage.textContent =
                    "Unable to load laundry orders.";
            }
        );

    } catch (error) {
        console.error(error);
        bookingMessage.textContent =
            "Unable to load student profile.";
    }
});

// STEP D: Create a laundry booking
form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!student || !currentUser) {
        alert("Please log in first.");
        return;
    }

    let clothes, total;

    try {
        ({ clothes, total } = getClothingDetails());
    } catch (error) {
        alert(error.message);
        return;
    }

    if (total < 1 || total > MAX_CLOTHES) {
        alert("Select between 1 and 10 items.");
        return;
    }

    const hasActiveOrder = myOrders.some(order =>
        order.status !== "Collected by Student"
    );

    if (hasActiveOrder) {
        alert("You already have an active laundry order.");
        return;
    }

    bookBtn.disabled = true;
    bookingMessage.textContent = "Saving your booking...";

    try {
        const bagId =
            "LE-" + crypto.randomUUID().split("-")[0].toUpperCase();

        const order = {
            bagId: bagId,
            studentUid: currentUser.uid,
            laundryId: student.laundryId,
            studentName: student.name,
            hostel: student.hostel,
            roomType: student.roomType,
            block: student.block,
            room: student.room,
            clothes: clothes,
            clothCount: total,
            notes: document.getElementById("notes").value.trim(),
            status: "Booked",
            createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, "laundryOrders"), order);

        bookingMessage.textContent =
            "Booking successful! Bag ID: " + bagId;

        form.reset();
        updateClothTotal();

    } catch (error) {
        console.error(error);
        bookingMessage.textContent =
            "Booking failed: " + error.message;
    } finally {
        updateClothTotal();
    }
});

// STEP E: Display laundry orders and QR labels
function displayOrders() {
    const container = document.getElementById("ordersList");
    container.replaceChildren();

    if (myOrders.length === 0) {
        container.textContent = "No laundry bookings yet.";
        return;
    }

    const sorted = [...myOrders].sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || "")
    );

    sorted.forEach(order => {
        const card = document.createElement("div");
        card.className = "order-card";

        function addText(tag, value) {
            const element = document.createElement(tag);
            element.textContent = value;
            card.appendChild(element);
        }

        addText("h3", "Bag ID: " + order.bagId);
        addText("p", "Laundry ID: " + order.laundryId);
        addText("p", "Total Clothes: " + order.clothCount);
        addText("p", "Status: " + order.status);

        addText("h4", "Clothing Breakdown");

        Object.entries(order.clothes || {}).forEach(
            ([type, quantity]) => {
                if (quantity > 0) {
                    addText(
                        "p",
                        (clothingNames[type] || type) + ": " + quantity
                    );
                }
            }
        );

        const qrBox = document.createElement("div");
        qrBox.className = "qr-container";
        card.appendChild(qrBox);

        if (typeof QRCode !== "undefined") {
            new QRCode(qrBox, {
                text: order.bagId,
                width: 150,
                height: 150,
                correctLevel: QRCode.CorrectLevel.H
            });

            const printBtn = document.createElement("button");
            printBtn.textContent = "Print Bag Label";
            printBtn.type = "button";

            printBtn.addEventListener("click", () => {
                const qrElement =
                    qrBox.querySelector("img") ||
                    qrBox.querySelector("canvas");

                if (!qrElement) return;

                const imageData = qrElement.tagName === "CANVAS"
                    ? qrElement.toDataURL("image/png")
                    : qrElement.src;

                const printPage = window.open("", "_blank");

                if (!printPage) {
                    alert("Please allow pop-ups for printing.");
                    return;
                }

                const printDoc = printPage.document;
                const heading = printDoc.createElement("h2");
                heading.textContent = "LaundryEase";

                const image = printDoc.createElement("img");
                image.src = imageData;
                image.width = 180;
                image.height = 180;

                const bag = printDoc.createElement("p");
                bag.textContent = "Bag ID: " + order.bagId;

                const laundry = printDoc.createElement("p");
                laundry.textContent =
                    "Laundry ID: " + order.laundryId;

                const location = printDoc.createElement("p");
                location.textContent =
                    order.hostel + " | " + order.roomType +
                    " | Block " + order.block;

                printDoc.body.append(
                    heading, image, bag, laundry, location
                );

                image.onload = () => {
                    printPage.focus();
                    printPage.print();
                };
            });

            card.appendChild(printBtn);
        }

        container.appendChild(card);
    });
}

// STEP F: Logout
document.getElementById("logoutBtn")
    .addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (error) {
            alert("Unable to log out. Please try again.");
        }
    });

updateClothTotal();
