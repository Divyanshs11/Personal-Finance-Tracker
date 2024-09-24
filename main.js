import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, query, collection, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDvMilVP8LClwruDBlazeoYYgoiwSpfROQ",
    authDomain: "finance-tracker-a7593.firebaseapp.com",
    projectId: "finance-tracker-a7593",
    storageBucket: "finance-tracker-a7593.appspot.com",
    messagingSenderId: "27947290444",
    appId: "1:27947290444:web:f875515390231719f6c9e9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let totalSavings = 0;
let totalExpenses = 0;
let expenses = [];
let expenseChart = null;
let goalAmount = 0;

document.addEventListener("DOMContentLoaded", () => {
    const incomeInput = document.getElementById("income");
    const saveIncomeBtn = document.getElementById("save-income");
    const savingsAmount = document.getElementById("savings-amount");
    const expenseForm = document.getElementById("expense-form");
    const expenseList = document.getElementById("expense-list");
    const totalAmount = document.getElementById("total-amount");
    const savingsGoalForm = document.getElementById("savings-goal-form");
    const goalItemName = document.getElementById("goal-item-name");
    const goalAmountLeft = document.getElementById("goal-amount-left");
    const timeLeft = document.getElementById("time-left");
    const extendGoalBtn = document.getElementById("extend-goal");
    const reduceGoalBtn = document.getElementById("reduce-goal");
    const chartPeriod = document.getElementById("chart-period");
    const expenseChartCtx = document.getElementById("expenseChart").getContext("2d");

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadUserData();
        } else {
            window.location.href = "login.html";
        }
    });

    saveIncomeBtn.addEventListener("click", async () => {
        const income = parseFloat(incomeInput.value) || 0;
        totalSavings += income;
        savingsAmount.textContent = totalSavings.toFixed(2);
        alert(`Income of ₹${income.toFixed(2)} added! Total savings: ₹${totalSavings.toFixed(2)}`);
        incomeInput.value = "";
        updateGoal();
        await updateUserData();
    });

    expenseForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const expenseName = document.getElementById("expense-name").value;
        const expenseAmount = parseFloat(document.getElementById("expense-amount").value) || 0;
        const expenseCategory = document.getElementById("expense-category").value;
        const expenseDate = document.getElementById("expense-date").value;

        const newExpense = {
            name: expenseName,
            amount: expenseAmount,
            category: expenseCategory,
            date: expenseDate
        };
        expenses.push(newExpense);

        const newRow = document.createElement("tr");
        newRow.innerHTML = `
            <td>${expenseName}</td>
            <td>₹${expenseAmount.toFixed(2)}</td>
            <td>${expenseCategory}</td>
            <td>${expenseDate}</td>
            <td><button class="delete-btn">Delete</button></td>
        `;
        expenseList.appendChild(newRow);

        totalExpenses += expenseAmount;
        totalSavings -= expenseAmount;
        savingsAmount.textContent = totalSavings.toFixed(2);
        totalAmount.textContent = totalExpenses.toFixed(2);
        updateGoal();
        updateChart();
        expenseForm.reset();
        await updateUserData();
    });

    expenseList.addEventListener("click", async (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const row = e.target.parentElement.parentElement;
            const amount = parseFloat(row.cells[1].textContent.replace("₹", ""));
            totalExpenses -= amount;
            totalSavings += amount;
            savingsAmount.textContent = totalSavings.toFixed(2);
            totalAmount.textContent = totalExpenses.toFixed(2);

            const index = Array.from(expenseList.children).indexOf(row);
            const deletedExpense = expenses.splice(index, 1)[0];

            row.remove();
            updateGoal();
            updateChart();
            await updateUserData(deletedExpense);
        }
    });

    savingsGoalForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        goalAmount = parseFloat(document.getElementById("goal-amount").value) || 0;
        const goalItem = document.getElementById("goal-item").value;
        const goalStartDate = new Date(document.getElementById("goal-start-date").value);
        const goalEndDate = new Date(document.getElementById("goal-end-date").value);
        
        if (goalStartDate >= goalEndDate) {
            alert("End date must be after start date.");
            return;
        }
        
        goalItemName.textContent = goalItem;
        timeLeft.dataset.goalStartDate = goalStartDate.toISOString();
        timeLeft.dataset.goalEndDate = goalEndDate.toISOString();
        updateGoal();
        savingsGoalForm.reset();
        updateTimeLeft();
        await updateUserData();
    });

    // New: Delete Goal button functionality
    const deleteGoalBtn = document.getElementById("delete-goal");
    deleteGoalBtn.addEventListener("click", async () => {
        goalAmount = 0;
        goalItemName.textContent = "None";
        timeLeft.dataset.goalStartDate = "";
        timeLeft.dataset.goalEndDate = "";
        goalAmountLeft.textContent = "0.00";
        timeLeft.textContent = "No active goal";
        await updateUserData();
        alert("Savings goal has been deleted.");
    });

    function updateGoal() {
        const requiredAmount = Math.max(0, goalAmount - totalSavings);
        goalAmountLeft.textContent = requiredAmount.toFixed(2);
        const goalStartDate = new Date(timeLeft.dataset.goalStartDate);
        const goalEndDate = new Date(timeLeft.dataset.goalEndDate);
        const currentDate = new Date();

        if (currentDate >= goalStartDate && currentDate <= goalEndDate) {
            const totalDays = (goalEndDate - goalStartDate) / (1000 * 60 * 60 * 24);
            const daysElapsed = (currentDate - goalStartDate) / (1000 * 60 * 60 * 24);
            const expectedSavings = (goalAmount / totalDays) * daysElapsed;
            const actualSavings = totalSavings;

            if (actualSavings >= expectedSavings) {
                console.log("You're on track to meet your savings goal!");
            } else {
                const deficit = expectedSavings - actualSavings;
                console.log(`You're behind on your savings goal by ₹${deficit.toFixed(2)}`);
            }
        }
        updateTimeLeft();
    }

    function updateTimeLeft() {
        const goalStartDate = new Date(timeLeft.dataset.goalStartDate);
        const goalEndDate = new Date(timeLeft.dataset.goalEndDate);
        const currentDate = new Date();

        if (currentDate < goalStartDate) {
            timeLeft.textContent = "Goal has not started yet.";
        } else if (currentDate > goalEndDate) {
            timeLeft.textContent = "Goal deadline has passed.";
        } else {
            const timeDiff = goalEndDate - currentDate;
            const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            timeLeft.textContent = `${daysLeft} days left to reach your goal.`;
        }
    }

    extendGoalBtn.addEventListener("click", async () => {
        const goalEndDate = new Date(timeLeft.dataset.goalEndDate);
        goalEndDate.setDate(goalEndDate.getDate() + 30);
        timeLeft.dataset.goalEndDate = goalEndDate.toISOString();
        updateTimeLeft();
        alert("Goal deadline extended by 30 days.");
        await updateUserData();
    });
    
    reduceGoalBtn.addEventListener("click", async () => {
        const goalEndDate = new Date(timeLeft.dataset.goalEndDate);
        const newEndDate = new Date(goalEndDate.setDate(goalEndDate.getDate() - 30));
        const startDate = new Date(timeLeft.dataset.goalStartDate);
        const currentDate = new Date();
    
        if (newEndDate <= startDate || newEndDate <= currentDate) {
            alert("Cannot reduce the deadline below the start date or current date.");
            return;
        }
    
        timeLeft.dataset.goalEndDate = newEndDate.toISOString();
        updateTimeLeft();
        alert("Goal deadline reduced by 30 days.");
        await updateUserData();
    });

    function updateChart() {
        if (expenseChart) {
            expenseChart.destroy();
        }

        const filteredExpenses = filterExpensesByPeriod(chartPeriod.value);

        const categories = ["Food", "Transport", "Entertainment", "Other"];
        const categorySums = categories.map(category => {
            return filteredExpenses
                .filter(expense => expense.category === category)
                .reduce((sum, expense) => sum + expense.amount, 0);
        });

        expenseChart = new Chart(expenseChartCtx, {
            type: "bar",
            data: {
                labels: categories,
                datasets: [{
                    label: `Expenses for ${chartPeriod.value}`,
                    data: categorySums,
                    backgroundColor: ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0"],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '₹' + context.formattedValue;
                            }
                        }
                    }
                }
            }
        });
    }

    function filterExpensesByPeriod(period) {
        const now = new Date();
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            switch (period) {
                case "7days":
                    return (now - expenseDate) / (1000 * 60 * 60 * 24) <= 7;
                case "30days":
                    return (now - expenseDate) / (1000 * 60 * 60 * 24) <= 30;
                case "all":
                default:
                    return true;
            }
        });
    }

    document.getElementById("sign-out").addEventListener("click", () => {
        signOut(auth)
            .then(() => {
                alert("You have successfully signed out.");
                window.location.href = "login.html";
            })
            .catch((error) => {
                console.error("Error signing out:", error.message);
                alert("Error signing out: " + error.message);
            });
    });

    async function loadUserData() {
        try {
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                totalSavings = userData.totalSavings || 0;
                totalExpenses = userData.totalExpenses || 0;
                expenses = userData.expenses || [];
                goalAmount = userData.goalAmount || 0;
                goalItemName.textContent = userData.goalItem || "None";
                timeLeft.dataset.goalStartDate = userData.goalStartDate || "";
                timeLeft.dataset.goalEndDate = userData.goalEndDate || "";

                savingsAmount.textContent = totalSavings.toFixed(2);
                totalAmount.textContent = totalExpenses.toFixed(2);

                expenseList.innerHTML = "";
                expenses.slice(-10).forEach(expense => {
                    const newRow = document.createElement("tr");
                    newRow.innerHTML = `
                        <td>${expense.name}</td>
                        <td>₹${expense.amount.toFixed(2)}</td>
                        <td>${expense.category}</td>
                        <td>${expense.date}</td>
                        <td><button class="delete-btn">Delete</button></td>
                    `;
                    expenseList.appendChild(newRow);
                });

                updateGoal();
                updateChart();
            }
        } catch (error) {
            console.error("Error loading user data:", error);
            alert("Error loading user data. Please try again.");
        }
    }

    async function updateUserData(deletedExpense = null) {
        try {
            const userDocRef = doc(db, "users", currentUser.uid);
            
            if (deletedExpense) {
                await updateDoc(userDocRef, {
                    totalSavings: totalSavings,
                    totalExpenses: totalExpenses,
                    expenses: arrayRemove(deletedExpense)
                });
            } else {
                await setDoc(userDocRef, {
                    totalSavings: totalSavings,
                    totalExpenses: totalExpenses,
                    expenses: expenses,
                    goalAmount: goalAmount,
                    goalItem: goalItemName.textContent,
                    goalStartDate: timeLeft.dataset.goalStartDate,
                    goalEndDate: timeLeft.dataset.goalEndDate
                }, { merge: true });
            }
        } catch (error) {
            console.error("Error updating user data:", error);
            alert("Error updating data. Please try again.");
        }
    }

    updateChart();
    chartPeriod.addEventListener("change", updateChart);
    setInterval(updateTimeLeft, 60000);
});