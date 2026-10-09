
function getData(key) {
    return JSON.parse(localStorage.getItem(key) || "[]");
}

function makeText(parent, tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    parent.appendChild(element);
    return element;
}

function loadAdminDashboard() {
    const students = getData("laundryStudents");
    const orders = getData("laundryOrders");

    const completed = orders.filter(o =>
        o.status === "Collected by Student"
    );

    const active = orders.filter(o =>
        o.status !== "Collected by Student"
    );

    const ready = orders.filter(o =>
        o.status === "Ready for Collection"
    );

    document.getElementById("totalStudents").textContent =
        students.length;

    document.getElementById("totalOrders").textContent =
        orders.length;

    document.getElementById("activeOrders").textContent =
        active.length;

    document.getElementById("completedOrders").textContent =
        completed.length;

    document.getElementById("readyOrders").textContent =
        ready.length;

    showHostelStats(students, orders);
    showCollectionPoints(orders);
    showAllOrders(orders);
}

function showHostelStats(students, orders) {
    const container = document.getElementById("hostelStats");
    container.replaceChildren();

    ["Boys", "Girls"].forEach(hostel => {
        const registered = students.filter(s =>
            s.hostel === hostel
        ).length;

        const hostelOrders = orders.filter(o =>
            o.hostel === hostel
        );

        const section = document.createElement("div");
        section.className = "order-card";

        makeText(section, "h3", hostel + " Hostel");
        makeText(section, "p", "Students: " + registered);
        makeText(section, "p",
            "Total Orders: " + hostelOrders.length
        );

        ["AC", "Non-AC"].forEach(type => {
            const count = hostelOrders.filter(o =>
                o.roomType === type
            ).length;

            makeText(section, "p", type + " Orders: " + count);
        });

        makeText(section, "p",
            hostel === "Boys"
                ? "Submit: Tuesday | Collect: Friday"
                : "Submit: Wednesday | Collect: Saturday"
        );

        container.appendChild(section);
    });
}

function showCollectionPoints(orders) {
    const container =
        document.getElementById("collectionPoints");

    container.replaceChildren();

    const groups = {};

    orders.forEach(order => {
        const key = [
            order.hostel,
            order.roomType,
            order.block
        ].join(" | ");

        if (!groups[key]) groups[key] = [];
        groups[key].push(order);
    });

    const entries = Object.entries(groups);

    if (!entries.length) {
        container.textContent = "No laundry orders yet.";
        return;
    }

    entries.forEach(([location, groupOrders]) => {
        const card = document.createElement("div");
        card.className = "order-card";

        makeText(card, "h3", location);
        makeText(card, "p",
            "Total Orders: " + groupOrders.length
        );

        const pending = groupOrders.filter(o =>
            o.status !== "Collected by Student"
        ).length;

        makeText(card, "p", "Active Orders: " + pending);
        container.appendChild(card);
    });
}

function showAllOrders(orders) {
    const container = document.getElementById("adminOrders");
    container.replaceChildren();

    const search = document.getElementById("adminSearch")
        .value.trim().toLowerCase();

    const filtered = orders.filter(o =>
        String(o.studentId).toLowerCase().includes(search) ||
        String(o.bagId).toLowerCase().includes(search)
    );

    if (!filtered.length) {
        container.textContent = "No matching laundry orders.";
        return;
    }

    filtered.slice().reverse().forEach(order => {
        const card = document.createElement("div");
        card.className = "order-card";

        makeText(card, "h3", "Bag: " + order.bagId);
        makeText(card, "p", "Student: " + order.studentName);
        makeText(card, "p", "Student ID: " + order.studentId);
        makeText(card, "p",
            "Location: " + order.hostel + " | " +
            order.roomType + " | Block " + order.block
        );
        makeText(card, "p", "Room: " + order.room);
        makeText(card, "p", "Clothes: " + order.clothCount);
        makeText(card, "p", "Status: " + order.status);

        container.appendChild(card);
    });
}

document.getElementById("adminSearch")
    .addEventListener("input", loadAdminDashboard);

window.addEventListener("storage", loadAdminDashboard);

loadAdminDashboard();
