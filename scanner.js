
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// LaundryEase - Firebase Staff QR Scanner

const statuses = [
  "Booked",
  "Collected",
  "Ready to Wash",
  "Washing",
  "Drying",
  "Ironing",
  "Ready for Collection",
  "Collected by Student"
];

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

let staff = null;
let orders = [];
let unsubscribeOrders = null;
let selectedBagId = "";
let qrScanner = null;

const scanMessage = document.getElementById("scanMessage");
const scannedOrder = document.getElementById("scannedOrder");

function addText(parent, tag, value) {
  const element = document.createElement(tag);
  element.textContent = String(value ?? "");
  parent.appendChild(element);
  return element;
}

function showMessage(text) {
  scanMessage.textContent = text;
}

function resetDashboard() {
  orders = [];
  selectedBagId = "";
  scannedOrder.replaceChildren();

  ["totalOrders", "activeOrders", "readyOrders"].forEach(id => {
    document.getElementById(id).textContent = "0";
  });

  document.getElementById("staffOrders").replaceChildren();
}

// 1. VERIFY FIREBASE STAFF ACCOUNT
onAuthStateChanged(auth, async user => {
  if (unsubscribeOrders) {
    unsubscribeOrders();
    unsubscribeOrders = null;
  }

  resetDashboard();
  staff = null;

  if (!user) {
    window.location.replace("staff-login.html");
    return;
  }

  try {
    const staffSnapshot = await getDoc(
      doc(db, "staff", user.uid)
    );

    if (!staffSnapshot.exists()) {
      showMessage("Staff profile not found in Firestore.");
      await signOut(auth);
      return;
    }

    const profile = staffSnapshot.data();

    if (profile.role !== "staff" || profile.active !== true) {
      showMessage("Staff account is not authorized.");
      await signOut(auth);
      return;
    }

    if (!profile.hostel || !profile.roomType ||
        !profile.block) {
      showMessage("Staff collection assignment is incomplete.");
      return;
    }

    staff = profile;

    showMessage(
      `Signed in: ${staff.name} | ${staff.hostel} | ` +
      `${staff.roomType} | Block ${staff.block}`
    );

    // 2. LOAD ONLY ASSIGNED FIRESTORE ORDERS
    const ordersQuery = query(
      collection(db, "laundryOrders"),
      where("hostel", "==", staff.hostel),
      where("roomType", "==", staff.roomType),
      where("block", "==", staff.block)
    );

    unsubscribeOrders = onSnapshot(
      ordersQuery,
      snapshot => {
        orders = snapshot.docs.map(item => ({
          ...item.data(),
          id: item.id
        }));

        console.log("Firebase orders loaded:", orders.length);

        renderOrders();

        if (selectedBagId) {
          findScannedBag(selectedBagId, false);
        }
      },
      error => {
        console.error("Firestore listener error:", error);

        showMessage(
          "Firestore error: " +
          (error.code || error.message)
        );
      }
    );

    initializeScanner();

  } catch (error) {
    console.error("Staff initialization error:", error);

    showMessage(
      "Staff setup error: " +
      (error.code || error.message)
    );
  }
});

// 3. RENDER STAFF DASHBOARD ORDERS
function renderOrders() {
  document.getElementById("totalOrders").textContent =
    orders.length;

  document.getElementById("activeOrders").textContent =
    orders.filter(o =>
      o.status !== "Collected by Student"
    ).length;

  document.getElementById("readyOrders").textContent =
    orders.filter(o =>
      o.status === "Ready for Collection"
    ).length;

  const search = document.getElementById("searchBag")
    .value.trim().toLowerCase();

  const hostel = document.getElementById("filterHostel").value;
  const roomType = document.getElementById("filterRoomType").value;
  const block = document.getElementById("filterBlock")
    .value.trim().toLowerCase();

  const filtered = orders.filter(order => {
    const matchesSearch =
      String(order.bagId || "").toLowerCase().includes(search) ||
      String(order.laundryId || "").toLowerCase().includes(search);

    const matchesHostel =
      !hostel || order.hostel === hostel;

    const matchesRoom =
      !roomType || order.roomType === roomType;

    const matchesBlock =
      !block || String(order.block || "")
        .toLowerCase().includes(block);

    return matchesSearch &&
      matchesHostel && matchesRoom && matchesBlock;
  });

  const container = document.getElementById("staffOrders");
  container.replaceChildren();

  if (filtered.length === 0) {
    addText(
      container, "p",
      "No Firebase orders found for this collection section."
    );
    return;
  }

  filtered.forEach(order => {
    const card = document.createElement("div");
    card.className = "order-card";

    addText(card, "h3", "Bag ID: " + order.bagId);
    addText(card, "p", "Student: " + order.studentName);
    addText(card, "p", "Laundry ID: " + order.laundryId);
    addText(card, "p", "Total Clothes: " + order.clothCount);
    addText(card, "p", "Status: " + order.status);

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "View Laundry Bag";

    button.addEventListener("click", () => {
      findScannedBag(order.bagId);
    });

    card.appendChild(button);
    container.appendChild(card);
  });
}

// 4. FIND SCANNED OR MANUALLY ENTERED BAG
function findScannedBag(bagId, showError = true) {
  if (!staff) {
    showMessage("Please log in as authorized staff.");
    return;
  }

  const cleanId = String(bagId).trim();

  const order = orders.find(item =>
    String(item.bagId).trim() === cleanId
  );

  scannedOrder.replaceChildren();

  if (!order) {
    selectedBagId = "";

    if (showError) {
      showMessage(
        "Bag not found in your assigned section. " +
        "Check hostel, room type, block and Bag ID."
      );
    }

    return;
  }

  selectedBagId = order.bagId;

  showMessage("✅ Laundry bag found in Firebase!");

  addText(scannedOrder, "h3", "Bag ID: " + order.bagId);

  const details = [
    ["Student Name", order.studentName],
    ["Laundry ID", order.laundryId],
    ["Hostel", order.hostel],
    ["Room Type", order.roomType],
    ["Block", order.block],
    ["Room Number", order.room],
    ["Total Clothes", order.clothCount],
    ["Current Status", order.status]
  ];

  details.forEach(([label, value]) => {
    addText(scannedOrder, "p", `${label}: ${value}`);
  });

  addText(scannedOrder, "h4", "Clothing Breakdown");

  Object.entries(order.clothes || {}).forEach(
    ([type, quantity]) => {
      if (quantity > 0) {
        addText(
          scannedOrder,
          "p",
          `${clothingNames[type] || type}: ${quantity}`
        );
      }
    }
  );

  // 5. UPDATE ORDER STATUS
  const index = statuses.indexOf(order.status);

  if (index >= 0 && index < statuses.length - 1) {
    const nextStatus = statuses[index + 1];

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Update to: " + nextStatus;

    button.addEventListener("click", async () => {
      const confirmed = confirm(
        `Update bag ${order.bagId} to ${nextStatus}?`
      );

      if (!confirmed) return;

      button.disabled = true;

      try {
        await updateDoc(
          doc(db, "laundryOrders", order.id),
          {
            status: nextStatus,
            updatedAt: new Date().toISOString()
          }
        );

        showMessage(
          "✅ Laundry status updated to " + nextStatus
        );

      } catch (error) {
        console.error("Status update failed:", error);

        showMessage(
          "Update failed: " +
          (error.code || error.message)
        );

        button.disabled = false;
      }
    });

    scannedOrder.appendChild(button);

  } else if (index === statuses.length - 1) {
    addText(
      scannedOrder,
      "p",
      "✅ This laundry order is completed."
    );
  } else {
    addText(scannedOrder, "p", "Unknown order status.");
  }
}

// 6. MANUAL BAG ID SEARCH
document.getElementById("findBagBtn")
  .addEventListener("click", () => {
    const bagId = document.getElementById("manualBagId")
      .value.trim();

    if (!bagId) {
      showMessage("Please enter a Bag ID.");
      return;
    }

    findScannedBag(bagId);
  });

// 7. STAFF DASHBOARD FILTERS
[
  "searchBag",
  "filterHostel",
  "filterRoomType",
  "filterBlock"
].forEach(id => {
  document.getElementById(id).addEventListener(
    "input", renderOrders
  );
});

// 8. CAMERA QR SCANNER
function initializeScanner() {
  if (qrScanner) return;

  if (typeof Html5QrcodeScanner === "undefined") {
    showMessage(
      "QR library unavailable. Use manual Bag ID search."
    );
    return;
  }

  qrScanner = new Html5QrcodeScanner(
    "qr-reader",
    {
      fps: 10,
      qrbox: { width: 220, height: 220 }
    },
    false
  );

  qrScanner.render(
    decodedText => {
      if (!staff) return;

      // QR code contains the unique Bag ID.
      findScannedBag(decodedText);
    },
    error => {
      // Camera may report frequent scan misses.
      // Ignore these until a valid QR is scanned.
    }
  );
}
