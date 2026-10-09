
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

const ordersKey = "laundryOrders";

function getOrders() {
    return JSON.parse(localStorage.getItem(ordersKey) || "[]");
}

function saveOrders(orders) {
    localStorage.setItem(ordersKey, JSON.stringify(orders));
}

function updateStatus(orderId) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);

    if (!order) return;

    const currentIndex = statuses.indexOf(order.status);

    if (currentIndex === -1 ||
        currentIndex === statuses.length - 1) {
        return;
    }

    const nextStatus = statuses[currentIndex + 1];

    const confirmed = confirm(
        `Update ${order.bagId} to "${nextStatus}"?`
    );

    if (!confirmed) return;

    order.status = nextStatus;
    order.updatedAt = new Date().toISOString();

    saveOrders(orders);
    displayStaffOrders();
}

function displayStaffOrders() {
    const allOrders = getOrders();

    document.getElementById("totalOrders").textContent =
        allOrders.length;

    document.getElementById("activeOrders").textContent =
        allOrders.filter(o =>
            o.status !== "Collected by Student"
        ).length;

    document.getElementById("readyOrders").textContent =
        allOrders.filter(o =>
            o.status === "Ready for Collection"
        ).length;

    const search = document.getElementById("searchBag")
        .value.trim().toLowerCase();

    const hostel = document.getElementById("filterHostel").value;
    const roomType = document.getElementById("filterRoomType").value;
    const block = document.getElementById("filterBlock")
        .value.trim().toLowerCase();

    const filtered = allOrders.filter(o => {
        const matchesSearch =
            String(o.bagId).toLowerCase().includes(search) ||
            String(o.studentId).toLowerCase().includes(search);

        const matchesHostel = !hostel || o.hostel === hostel;
        const matchesRoom = !roomType || o.roomType === roomType;
        const matchesBlock = !block ||
            String(o.block).toLowerCase().includes(block);

        return matchesSearch && matchesHostel &&
            matchesRoom && matchesBlock;
    });

    const container = document.getElementById("staffOrders");
    container.replaceChildren();

    if (filtered.length === 0) {
        container.textContent = "No matching laundry orders.";
        return;
    }

    filtered.slice().reverse().forEach(order => {
        const card = document.createElement("div");
        card.className = "order-card";

        const title = document.createElement("h3");
        title.textContent = "Bag: " + order.bagId;
        card.appendChild(title);

        const details = [
            ["Student", order.studentName],
            ["Student ID", order.studentId],
            ["Hostel", order.hostel],
            ["Room Type", order.roomType],
            ["Block", order.block],
            ["Room", order.room],
            ["Clothes", order.clothCount],
            ["Status", order.status]
        ];

        details.forEach(([label, value]) => {
            const p = document.createElement("p");
            p.textContent = `${label}: ${value}`;
            card.appendChild(p);
        });

        const index = statuses.indexOf(order.status);

        if (index >= 0 && index < statuses.length - 1) {
            const button = document.createElement("button");
            button.textContent = "Next: " + statuses[index + 1];
            button.addEventListener("click", () => {
                updateStatus(order.id);
            });
            card.appendChild(button);
        } else if (index === statuses.length - 1) {
            const completed = document.createElement("p");
            completed.textContent = "✅ Order completed";
            card.appendChild(completed);
        }

        container.appendChild(card);
    });
}

["searchBag", "filterHostel", "filterRoomType",
    "filterBlock"].forEach(id => {
        document.getElementById(id).addEventListener(
            "input", displayStaffOrders
        );
    });

window.addEventListener("storage", displayStaffOrders);
displayStaffOrders();
