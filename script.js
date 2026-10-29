// Khởi tạo biến lưu trữ dữ liệu từ localStorage (Yêu cầu 2)
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

// Lấy các element DOM
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const totalBalanceEl = document.getElementById("totalBalance");

const transactionForm = document.getElementById("transactionForm");
const formTitle = document.getElementById("formTitle");
const transactionType = document.getElementById("transactionType");
const transactionName = document.getElementById("transactionName");
const transactionAmount = document.getElementById("transactionAmount");
const transactionCategory = document.getElementById("transactionCategory");
const transactionDate = document.getElementById("transactionDate");
const submitBtn = document.getElementById("submitBtn");

const expenseList = document.getElementById("expenseList");
const emptyMessage = document.getElementById("emptyMessage");
const expenseCountText = document.getElementById("expenseCountText");
const selectedDayTitle = document.getElementById("selectedDayTitle");

const tabBtns = document.querySelectorAll(".tab-btn");
const chartsSection = document.getElementById("chartsSection");
const historySection = document.getElementById("historySection");

// Variables quản lý Lịch
let currentViewDate = new Date(); // Tháng/năm đang xem trên lịch
let selectedDateStr = null; // Ngày được bấm chọn (dạng "YYYY-MM-DD"), null = xem cả tháng

// Thêm danh mục mẫu cho Thu và Chi
const categoriesData = {
  income: ["Lương", "Bồi dưỡng", "Thưởng", "Phụ cấp", "Khác"],
  expense: ["Ăn uống", "Di chuyển", "Mua sắm", "Khác"],
};

// Khai báo biến giữ các thể hiện biểu đồ Chart.js
let monthlyChartInstance = null;
let categoryChartInstance = null;

// Đặt ngày mặc định cho input date là ngày hôm nay
transactionDate.valueAsDate = new Date();

// Định dạng tiền tệ VNĐ
function formatMoney(amount) {
  return amount.toLocaleString("vi-VN") + " ₫";
}

// Chống mã độc XSS
function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, function (char) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

// Yêu cầu 2 : Lưu dữ liệu vào LocalStorage ()
function saveToLocalStorage() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// ---------------- DỰNG LỊCH NOTION ----------------
function renderNotionCalendar() {
  const calendarEl = document.getElementById("notionCalendar");
  const monthTitleEl = document.getElementById("calendarMonthTitle");

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  monthTitleEl.innerText = `Tháng ${month + 1}/${year}`;

  // Tạo Header các ngày trong tuần (T2 - CN)
  const weekDays = ["Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"];
  let html = weekDays
    .map((d) => `<div class="calendar-day-head">${d}</div>`)
    .join("");

  // Ngày đầu tiên của tháng & Số ngày trong tháng
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Chuyển T2 thành 0
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // Ô ngày của tháng trước
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    html += `<div class="calendar-cell other-month"><span class="date-num">${prevMonthTotalDays - i}</span></div>`;
  }

  // Ô ngày của tháng hiện tại
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // Lấy giao dịch trong ngày này
    const dayTransactions = transactions.filter((t) => t.date === dateStr);
    const isSelected = selectedDateStr === dateStr ? "selected" : "";

    // Tạo badges hiển thị thu/chi
    let badgesHtml = dayTransactions
      .slice(0, 3)
      .map(
        (t) => `
            <div class="badge-item ${t.type === "income" ? "badge-income" : "badge-expense"}">
                ${t.type === "income" ? "+" : "-"}${t.amount >= 1000 ? t.amount / 1000 + "k" : t.amount} ${t.name}
            </div>
        `,
      )
      .join("");

    if (dayTransactions.length > 3) {
      badgesHtml += `<div class="badge-item" style="color:#787774">+${dayTransactions.length - 3} nữa</div>`;
    }

    html += `
            <div class="calendar-cell ${isSelected}" data-date="${dateStr}">
                <span class="date-num">${day}</span>
                ${badgesHtml}
            </div>
        `;
  }

  calendarEl.innerHTML = html;

  // Bắt sự kiện Bấm vào ô ngày trên lịch
  calendarEl.querySelectorAll(".calendar-cell[data-date]").forEach((cell) => {
    cell.addEventListener("click", () => {
      selectedDateStr = cell.dataset.date;
      renderApp();
    });
  });
}

// Điều hướng tháng
document.getElementById("prevMonthBtn").addEventListener("click", () => {
    currentViewDate.setMonth(currentViewDate.getMonth() - 1);
    selectedDateStr = null;
    renderApp();
});

document.getElementById("nextMonthBtn").addEventListener("click", () => {
    currentViewDate.setMonth(currentViewDate.getMonth() + 1);
    selectedDateStr = null;
    renderApp();
});

document.getElementById("showAllBtn").addEventListener("click", () => {
    selectedDateStr = null;
    renderApp();
});

// ---------------- CẬP NHẬT GIAO DIỆN CHÍNH ----------------
function renderApp() {
  renderNotionCalendar();

  let totalIncome = 0;
  let totalExpense = 0;

  // Tính tổng tất cả giao dịch
  transactions.forEach((item) => {
    if (item.type === "income") totalIncome += item.amount;
    if (item.type === "expense") totalExpense += item.amount;
  });

  totalIncomeEl.innerText = formatMoney(totalIncome);
  totalExpenseEl.innerText = formatMoney(totalExpense);
  totalBalanceEl.innerText = formatMoney(totalIncome - totalExpense);

  // Lọc danh sách giao dịch hiển thị bên dưới (Theo ngày đã chọn hoặc theo toàn bộ tháng)
  let displayTransactions = [];
  const currentYearMonth = `${currentViewDate.getFullYear()}-${String(currentViewDate.getMonth() + 1).padStart(2, "0")}`;

  if (selectedDateStr) {
    selectedDayTitle.innerText = `Lịch sử ngày: ${selectedDateStr}`;
    displayTransactions = transactions.filter(
      (item) => item.date === selectedDateStr,
    );
  } else {
    selectedDayTitle.innerText = `Tất cả giao dịch Tháng ${currentViewDate.getMonth() + 1}/${currentViewDate.getFullYear()}`;
    displayTransactions = transactions.filter(
      (item) => item.date && item.date.startsWith(currentYearMonth),
    );
  }

  const expenseCount = displayTransactions.filter(
    (item) => item.type === "expense",
  ).length;
  expenseCountText.innerText = `Có ${expenseCount} khoản chi trong danh sách này.`;
  emptyMessage.style.display =
    displayTransactions.length === 0 ? "block" : "none";

  // Render danh sách chi tiết
  expenseList.innerHTML = displayTransactions
    .map((item) => {
      const isIncome = item.type === "income";
      return `
            <li class="expense-item">
                <div class="expense-info">
                    <span class="expense-name">${escapeHTML(item.name)}</span>
                    <span class="expense-price ${isIncome ? "price-income" : "price-expense"}">
                        ${isIncome ? "+" : "-"}${formatMoney(item.amount)}
                    </span>
                    <span class="expense-meta">📁 ${escapeHTML(item.category)} | 📅 ${item.date}</span>
                </div>
                <button type="button" class="delete-btn" data-id="${item.id}">Xóa</button>
            </li>
        `;
    })
    .join("");
}

// Yêu cầu 6: Xử lý sự kiện chuyển Tab
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;

    if (tab === "all") {
      transactionForm.classList.add("hidden");
      chartsSection.classList.add("hidden");
      historySection.classList.remove("hidden");
    } else if (tab === "income") {
      transactionForm.classList.remove("hidden");
      chartsSection.classList.add("hidden");
      historySection.classList.remove("hidden");

      formTitle.innerText = "Thêm khoản Thu Nhập";
      transactionType.value = "income";
      submitBtn.innerText = "+ Thêm thu nhập";
      submitBtn.style.background = "#2e7d32";

      // Đổ danh mục Thu nhập vào thẻ Select
      transactionCategory.innerHTML = categoriesData.income
        .map((cat) => `<option value="${cat}">${cat}</option>`)
        .join("");
    } else if (tab === "expense") {
      transactionForm.classList.remove("hidden");
      chartsSection.classList.add("hidden");
      historySection.classList.remove("hidden");

      formTitle.innerText = "Thêm khoản Chi Tiêu";
      transactionType.value = "expense";
      submitBtn.innerText = "+ Thêm chi tiêu";
      submitBtn.style.background = "#c62828";

      // Đổ danh mục Chi tiêu vào thẻ Select
      transactionCategory.innerHTML = categoriesData.expense
        .map((cat) => `<option value="${cat}">${cat}</option>`)
        .join("");
    } else if (tab === "balance") {
      transactionForm.classList.add("hidden");
      historySection.classList.add("hidden");
      chartsSection.classList.remove("hidden");
      renderCharts();
    }
  });
});

// Xử lý thêm giao dịch mới
transactionForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = transactionName.value.trim();
  const amount = Number(transactionAmount.value);
  const category = transactionCategory.value;
  const type = transactionType.value;
  const date = transactionDate.value;

  if (!name || amount <= 0 || !date) {
    alert("Vui lòng điền đầy đủ và chính xác thông tin!");
    return;
  }

  transactions.unshift({
    id: Date.now(),
    name,
    amount,
    category,
    type,
    date,
  });

  saveToLocalStorage();
  renderApp();
  transactionForm.reset();
  transactionDate.valueAsDate = new Date();
  alert("Thêm thành công!");
});

// Yêu cầu 4: Dùng confirm() trước khi xóa
expenseList.addEventListener("click", function (e) {
  if (!e.target.classList.contains("delete-btn")) return;

  const isConfirmed = confirm("Bạn có chắc chắn muốn xóa giao dịch này không?");
  if (isConfirmed) {
    const id = Number(e.target.dataset.id);
    transactions = transactions.filter((item) => item.id !== id);
    saveToLocalStorage();
    renderApp();
  }
});

// Yêu cầu 7: Biểu đồ so sánh Thu nhập & Chi tiêu tháng trước vs tháng này & Bài tập nâng cao
function renderCharts() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Tính toán tháng trước
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonth = lastMonthDate.getMonth();
  const lastMonthYear = lastMonthDate.getFullYear();

  let thisMonthIncome = 0,
    thisMonthExpense = 0;
  let lastMonthIncome = 0,
    lastMonthExpense = 0;

  const categoryExpenseMap = {};

  transactions.forEach((item) => {
    const d = new Date(item.date);
    const m = d.getMonth();
    const y = d.getFullYear();

    // Thống kê tháng này
    if (m === currentMonth && y === currentYear) {
      if (item.type === "income") thisMonthIncome += item.amount;
      if (item.type === "expense") {
        thisMonthExpense += item.amount;
        categoryExpenseMap[item.category] =
          (categoryExpenseMap[item.category] || 0) + item.amount;
      }
    }

    // Thống kê tháng trước
    if (m === lastMonth && y === lastMonthYear) {
      if (item.type === "income") lastMonthIncome += item.amount;
      if (item.type === "expense") lastMonthExpense += item.amount;
    }
  });

  // Bài tập nâng cao 1: Biểu đồ cột so sánh Thu nhập & Chi tiêu tháng trước và tháng này
  const ctxMonthly = document.getElementById("monthlyChart").getContext("2d");
  if (monthlyChartInstance) monthlyChartInstance.destroy();
  monthlyChartInstance = new Chart(ctxMonthly, {
    type: "bar",
    data: {
      labels: [
        `Tháng ${lastMonth + 1}/${lastMonthYear}`,
        `Tháng ${currentMonth + 1}/${currentYear}`,
      ],
      datasets: [
        {
          label: "Thu nhập",
          data: [lastMonthIncome, thisMonthIncome],
          backgroundColor: "#4caf50",
        },
        {
          label: "Chi tiêu",
          data: [lastMonthExpense, thisMonthExpense],
          backgroundColor: "#f44336",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "So sánh Thu nhập và Chi tiêu với tháng trước",
        },
      },
    },
  });

  // Bài tập nâng cao 2: Biểu đồ Tròn (Pie Chart) phân tích chi tiêu theo danh mục tháng này
  const ctxCategory = document.getElementById("categoryChart").getContext("2d");
  if (categoryChartInstance) categoryChartInstance.destroy();

  const catLabels = Object.keys(categoryExpenseMap);
  const catData = Object.values(categoryExpenseMap);

  categoryChartInstance = new Chart(ctxCategory, {
    type: "pie",
    data: {
      labels: catLabels.length ? catLabels : ["Chưa có chi tiêu"],
      datasets: [
        {
          data: catData.length ? catData : [1],
          backgroundColor: [
            "#ff9800",
            "#2196f3",
            "#e91e63",
            "#9c27b0",
            "#607d8b",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Tỷ lệ chi tiêu các danh mục trong tháng này",
        },
      },
    },
  });
}

// Khởi chạy ứng dụng lần đầu
renderApp();
