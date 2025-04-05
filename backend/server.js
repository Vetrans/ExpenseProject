const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = 5000;
const SECRET_KEY = "your_secret_key"; // 🔒 Change this in production!

app.use(cors());
app.use(express.json());

// ✅ MySQL Database Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root", // Change if your MySQL user is different
    password: "Hrishabh@123", // Your MySQL password
    database: "expense_management",
});

db.connect((err) => {
    if (err) throw err;
    console.log("✅ Connected to MySQL Database!");
});

// ✅ JWT Middleware to Verify Token
const verifyToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(403).json({ error: "Access denied!" });

    try {
        const verified = jwt.verify(token.split(" ")[1], SECRET_KEY); // Ensure the token is correctly parsed
        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token!" }); // Invalid token error
    }
};

// ✅ User Registration
app.post("/api/auth/register", async (req, res) => {
    console.log("📥 Incoming Register Request:", req.body); // Debugging

    const { fullName, dob, email, password } = req.body;

    if (!fullName || !dob || !email || !password) {
        return res.status(400).json({ error: "All fields are required!" });
    }

    try {
        const [existingUser] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "User already exists!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.promise().query(
            "INSERT INTO users (fullName, dob, email, password) VALUES (?, ?, ?, ?)", // ✅ Fixed: Insert `name`
            [fullName, dob, email, hashedPassword]
        );

        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        console.error("❌ Database error:", error);
        res.status(500).json({ error: "Server error!" });
    }
});

// ✅ User Login
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "All fields are required!" });
    }

    try {
        const [user] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);

        if (user.length === 0) {
            return res.status(400).json({ error: "Invalid credentials!" });
        }

        const isMatch = await bcrypt.compare(password, user[0].password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials!" });
        }

        const token = jwt.sign({ id: user[0].id }, SECRET_KEY, { expiresIn: "7d" });

        res.status(200).json({ 
            message: "Login successful!", 
            token, 
            userId: user[0].id,
            name: user[0].fullName, // ✅ Fixed: Send `name` properly
            email: user[0].email 
        });
    } catch (error) {
        console.error("❌ Login Error:", error);
        res.status(500).json({ error: "Server error!" });
    }
});
// DELETE Expense Route
app.delete("/api/expenses/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
  
    try {
      const [result] = await db.promise().query("DELETE FROM expenses WHERE id = ? AND userId = ?", [id, req.user.id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Expense not found!" });
      }
  
      res.status(200).json({ message: "Expense deleted successfully!" });
    } catch (error) {
      console.error("❌ Delete Expense Error:", error);
      res.status(500).json({ error: "Server error!" });
    }
  });
  
// ✅ Fetch User Profile
app.get("/api/user/profile", verifyToken, async (req, res) => {
    try {
        const [user] = await db.promise().query("SELECT id, fullName, dob, email FROM users WHERE id = ?", [req.user.id]);

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found!" });
        }

        res.status(200).json(user[0]);
    } catch (error) {
        console.error("❌ Profile Fetch Error:", error);
        res.status(500).json({ error: "Server error!" });
    }
});

// ✅ Fetch User Expenses Route
app.get("/api/expenses", verifyToken, async (req, res) => {
    try {
        // Fetch all expenses for the logged-in user
        const [expenses] = await db.promise().query(
            "SELECT * FROM expenses WHERE userId = ?", 
            [req.user.id]
        );
        res.status(200).json(expenses); // Respond with all the expenses
    } catch (error) {
        console.error("❌ Fetch Expenses Error:", error);
        res.status(500).json({ error: "Server error" }); // Handle errors
    }
});

// ✅ Update User Profile
app.put("/api/user/profile/update", verifyToken, async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        return res.status(400).json({ error: "All fields are required!" });
    }

    try {
        await db.promise().query(
            "UPDATE users SET fullName = ?, name = ?, email = ? WHERE id = ?", // ✅ Fixed: Update `name`
            [fullName, email, req.user.id]
        );

        res.status(200).json({ message: "Profile updated successfully!" });
    } catch (error) {
        console.error("❌ Profile Update Error:", error);
        res.status(500).json({ error: "Server error!" });
    }
});

// ✅ Add Income
app.post("/api/income", verifyToken, async (req, res) => {
    const { source, amount, date } = req.body; // Change `title` to `source`
    const userId = req.user.id;

    if (!source || !amount || !date) { // Change `title` to `source`
        return res.status(400).json({ error: "All fields are required!" });
    }

    try {
        const [result] = await db.promise().query(
            "INSERT INTO income (source, amount, date, userId) VALUES (?, ?, ?, ?)",  // Corrected
            [source, amount, date, userId]  // Added a comma here
        );
        
        res.status(201).json({ message: "Income added successfully", id: result.insertId });
    } catch (error) {
        console.error("❌ Income Insert Error:", error);
        res.status(500).json({ error: "Database error" });
    }
});


// ✅ Add Expense Route
app.post("/api/expenses", verifyToken, async (req, res) => {
    const { category, amount, description, date } = req.body;
    const userId = req.user.id; // Get the user ID from the token

    try {
        // Insert the new expense into the database
        const [result] = await db.promise().query(
            "INSERT INTO expenses (category, amount, description, date, userId) VALUES (?, ?, ?, ?, ?)",
            [category, amount, description, date, userId]
        );
        res.status(201).json({ message: "Expense added successfully", id: result.insertId });
    } catch (error) {
        console.error("❌ Expense Insert Error:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// ✅ Finance Chatbot
const responses = {
    "how to identify undervalued stocks": "Analyze financial statements, compare price-to-earnings ratios, and research industry trends.",
    "what is margin trading": "Margin trading allows investors to borrow money to buy stocks, increasing both potential gains and risks.",
    "how to become financially literate": "Read books, take courses, follow financial news, and practice budgeting and investing.",
    "hi": "Hi!",
    "how to save money": "Track your expenses, set a budget, and reduce unnecessary spending!",
    "best investments": "Stocks, mutual funds, real estate, and index funds are great investment options.",
    "how to manage debt": "Pay off high-interest debts first, avoid unnecessary loans, and create a repayment plan.",
    "what is inflation": "Inflation is the rate at which the general price levels for goods and services rise, reducing purchasing power.",
    "how to improve credit score": "Pay bills on time, reduce outstanding debts, and avoid multiple credit inquiries.",
    "difference between stocks and bonds": "Stocks give ownership in a company, while bonds are loans you give to companies or governments.",
    "what is a budget": "A budget is a plan that tracks your income and expenses to manage your money effectively.",
    "should i invest in cryptocurrency": "Crypto investments can be volatile. Invest only if you understand the risks and can afford potential losses.",
    "how do taxes work": "Taxes are mandatory payments to the government based on your income, purchases, or property value.",
    "how to start investing": "Start with low-risk options like index funds or mutual funds, and gradually explore stocks and real estate.",
    "what is a credit score": "A credit score is a numerical rating that represents your creditworthiness based on your financial history.",
    "how to build wealth": "Invest wisely, save consistently, create multiple income streams, and control expenses.",
    "why should i invest early": "Investing early allows you to take advantage of compound interest, maximizing long-term growth.",
    "how does compound interest work": "Compound interest is interest earned on both the initial amount and previously earned interest, making your money grow exponentially.",
    "what are mutual funds": "Mutual funds pool money from multiple investors to invest in stocks, bonds, and other assets.",
    "how does the stock market work": "The stock market is where shares of companies are bought and sold, allowing companies to raise funds and investors to earn profits.",
    "how to plan for retirement": "Start saving early, invest in retirement accounts, and consider diversified investments to secure your future.",
    "what is a 401(k)": "A 401(k) is a retirement savings plan that allows employees to contribute pre-tax earnings, often with employer matching.",
    "is real estate a good investment": "Real estate can be a great long-term investment, offering passive income and potential appreciation in value.",
    "how do loans work": "Loans are borrowed money that must be repaid with interest over a specified period.",
    "how to reduce expenses": "Identify unnecessary spending, compare prices, negotiate bills, and cut subscriptions you don’t use.",
    "what is a side hustle": "A side hustle is a way to earn additional income outside of your main job, such as freelancing or starting a small business.",
    "how do credit cards work": "Credit cards allow you to borrow money up to a limit, which you must repay monthly to avoid high-interest charges.",
    "what is financial freedom": "Financial freedom means having enough savings, investments, and passive income to cover your living expenses without relying on a paycheck.",
    "how to invest in gold": "You can invest in gold through physical gold, gold ETFs, mutual funds, or gold mining stocks.",
    "what are index funds": "Index funds are mutual funds or ETFs that track a stock market index like the S&P 500, offering diversification at low cost.",
    "how to set financial goals": "Define short-term and long-term goals, create a savings plan, and track your progress regularly.",
    "what is passive income": "Passive income is money earned with little to no effort, such as rental income, dividends, or online businesses.",
    "how to save for a house": "Save for a down payment, improve your credit score, and budget wisely to afford mortgage payments.",
    "why do we pay taxes": "Taxes fund public services like infrastructure, education, healthcare, and defense.",
    "what is diversification in investing": "Diversification means spreading your investments across different assets to reduce risk.",
    "how to protect against fraud": "Use strong passwords, monitor bank statements, enable two-factor authentication, and avoid sharing personal information online.",
    "how to create a budget": "List your income and expenses, allocate funds wisely, and adjust spending as needed to stay within your financial limits.",
    "how to start a business": "Develop a business plan, secure funding, register legally, and market your products or services effectively.",
    "what is an emergency fund": "An emergency fund is savings set aside for unexpected expenses like medical emergencies or job loss.",
    "how to retire early": "Increase savings, invest wisely, minimize unnecessary expenses, and generate passive income streams.",
    "what is the gig economy": "The gig economy consists of temporary or freelance jobs, often through digital platforms like Uber, Fiverr, and Upwork.",
    "how to calculate net worth": "Net worth is your total assets minus your total liabilities (debts).",
    "how does inflation affect savings": "Inflation reduces the purchasing power of money, meaning your savings lose value over time unless they earn interest or investment returns.",
    "how to manage personal finances": "Track income and expenses, save consistently, invest wisely, and avoid unnecessary debt.",
    "what is a Roth IRA": "A Roth IRA is a retirement account where contributions are taxed upfront, but withdrawals in retirement are tax-free.",
    "how does the economy affect investments": "Economic conditions like inflation, interest rates, and market trends impact the value of investments.",
    "should i rent or buy a home": "Renting offers flexibility, while buying builds equity. The decision depends on your financial goals and lifestyle.",
    "what is cryptocurrency": "Cryptocurrency is a digital or virtual currency that uses cryptography for secure transactions and operates on decentralized technology.",
    "how does insurance work": "Insurance is a contract where you pay premiums in exchange for financial protection against risks like health issues or accidents.",
    "how to earn passive income": "Ways to earn passive income include dividends, rental properties, digital products, and affiliate marketing.",
    "how to reduce taxes legally": "Use tax deductions, invest in tax-advantaged accounts, and keep proper financial records.",
    "what is financial planning": "Financial planning involves setting goals, budgeting, investing, and managing risks to secure your financial future.",
    "how to budget for a vacation": "Set a spending limit, save gradually, book in advance, and track expenses to stay within budget.",
    "what is an ETF": "An Exchange-Traded Fund (ETF) is a type of investment fund that holds assets like stocks and bonds and is traded on stock exchanges.",
    "how does social security work": "Social Security is a government program that provides retirement, disability, and survivor benefits to eligible individuals.",
    "what is an IPO": "An Initial Public Offering (IPO) is when a company sells its shares to the public for the first time to raise capital.",
    "how to reduce student loan debt": "Make extra payments, refinance at lower rates, and apply for loan forgiveness programs if eligible.",
    "what is a dividend": "A dividend is a portion of a company's earnings paid to shareholders as a return on investment.",
    "how do I invest in real estate with little money": "Consider REITs, partnerships, or owner-financing options to get started with minimal capital.",
    "how to negotiate a higher salary": "Research industry salaries, highlight your achievements, and confidently negotiate during job offers or performance reviews.",
    "what is a money market account": "A money market account is a type of savings account that offers higher interest rates and limited check-writing capabilities.",
    "how to avoid lifestyle inflation": "Increase savings as your income grows, stick to a budget, and resist unnecessary luxury spending.",
    "how to negotiate a higher salary": "Research industry salaries, highlight your achievements, and confidently negotiate during job offers or performance reviews.",
    "what is a money market account": "A money market account is a type of savings account that offers higher interest rates and limited check-writing capabilities.",
    "how to avoid lifestyle inflation": "Increase savings as your income grows, stick to a budget, and resist unnecessary luxury spending.",
    "what is a high-yield savings account": "A high-yield savings account offers a higher interest rate than traditional savings accounts, helping your money grow faster.",
    "how to pay off credit card debt": "Make more than the minimum payment, focus on high-interest balances first, and consider a debt consolidation plan.",
    "what are treasury bonds": "Treasury bonds are government-issued securities that provide a fixed interest rate over a long-term period.",
    "how to invest in real estate": "You can invest in real estate through rental properties, REITs, house flipping, or real estate crowdfunding.",
    "what is a financial advisor": "A financial advisor is a professional who provides guidance on investments, savings, and financial planning.",
    "how to calculate return on investment (ROI)": "ROI is calculated as (Net Profit / Initial Investment) × 100 to measure investment efficiency.",
    "what is a FICO score": "A FICO score is a type of credit score used by lenders to assess credit risk, typically ranging from 300 to 850.",
    "how does a Roth 401(k) differ from a traditional 401(k)": "A Roth 401(k) uses after-tax contributions, offering tax-free withdrawals in retirement, whereas a traditional 401(k) is taxed upon withdrawal.",
    "how to create an emergency fund": "Save at least 3-6 months' worth of expenses in a separate, easily accessible account.",
    "what is dollar-cost averaging": "Dollar-cost averaging is an investment strategy where you invest a fixed amount at regular intervals, reducing risk over time.",
    "how to protect your wealth": "Diversify investments, maintain an emergency fund, and invest in insurance policies for protection.",
    "how to start a freelance business": "Identify your skills, set competitive pricing, build a portfolio, and market yourself through networking and online platforms.",
    "what is asset allocation": "Asset allocation is the process of distributing investments across different asset classes to balance risk and reward.",
    "how to build generational wealth": "Invest in appreciating assets, create passive income streams, and pass down financial knowledge and resources to family.",
    "what is a capital gain": "A capital gain is the profit earned from selling an investment or asset for more than its purchase price.",
    "how does credit utilization affect your credit score": "Credit utilization refers to the percentage of your available credit in use; keeping it below 30% improves your credit score.",
    "what is an annuity": "An annuity is a financial product that provides periodic payments over time, typically used for retirement income.",
    "how to cut monthly expenses": "Cancel unused subscriptions, cook at home, compare service providers, and reduce energy usage to lower bills.",
    "what is a certificate of deposit (CD)": "A CD is a savings account with a fixed interest rate and a set term length, offering higher returns than regular savings accounts.",
    "how to prepare for a recession": "Increase savings, diversify investments, pay down debt, and build multiple income streams to stay financially secure.",
    "how to track expenses effectively": "Use budgeting apps, review bank statements, and categorize spending to monitor where your money goes.",
    "what is an individual retirement account (IRA)": "An IRA is a tax-advantaged retirement account that helps individuals save for the future with potential tax benefits.",
    "how to invest in dividend stocks": "Look for companies with a strong dividend history, high yield, and stable earnings to generate passive income.",
    "what is an expense ratio": "An expense ratio is the annual fee charged by mutual funds or ETFs, expressed as a percentage of assets under management.",
    "how to avoid common investment mistakes": "Diversify, invest for the long term, avoid emotional trading, and research before making financial decisions.",
    "what is financial literacy": "Financial literacy is the ability to understand and manage personal finances, including budgeting, investing, and debt management.",
    "how to build a strong credit history": "Pay bills on time, use credit responsibly, and maintain a mix of credit accounts to boost your credit score.",
    "what is a home equity loan": "A home equity loan lets you borrow against your home’s value, using it as collateral while paying fixed interest rates.",
    "how to maximize credit card rewards": "Use cards with cashback or travel perks, pay balances in full monthly, and take advantage of sign-up bonuses.",
    "how to invest in startups": "You can invest in startups through venture capital, angel investing, or crowdfunding platforms, but it carries high risk.",
    "what is estate planning": "Estate planning involves organizing your assets, creating a will, and planning for inheritance taxes and asset distribution.",
    "how to increase financial security": "Build savings, invest wisely, maintain multiple income streams, and avoid unnecessary financial risks.",
    "what is inflation risk": "Inflation risk refers to the potential loss of purchasing power due to rising prices, which can erode savings over time.",
    "how to invest in ETFs": "ETFs are traded like stocks; choose funds based on your investment goals, fees, and diversification needs.",
    "what is a 529 college savings plan": "A 529 plan is a tax-advantaged savings plan designed to help pay for education expenses.",
    "how does interest rate affect loans": "Higher interest rates increase the cost of borrowing, while lower rates make loans more affordable.",
    "how to set up a sinking fund": "A sinking fund is money saved for specific future expenses, such as vacations or major purchases.",
    "what is a target-date fund": "A target-date fund automatically adjusts its asset allocation as you approach a retirement date, reducing risk over time.",
    "how to create multiple income streams": "Start a side business, invest in stocks, earn rental income, and explore online income opportunities.",
    "what is private equity": "Private equity involves investing in private companies, often through funds that buy, manage, and sell businesses.",
    "how to plan for healthcare expenses in retirement": "Save in a Health Savings Account (HSA), consider long-term care insurance, and account for medical inflation.",
    "what is quantitative easing": "Quantitative easing is a central bank policy of purchasing financial assets to stimulate the economy by increasing money supply.",
    "how to build credit from scratch": "Get a secured credit card, become an authorized user on someone else’s card, and make consistent on-time payments.",
    "what is a margin account": "A margin account allows investors to borrow money to buy stocks, increasing potential returns but also increasing risk.",
    "how to analyze a company's financial health": "Review financial statements, check debt levels, assess profitability, and compare with industry benchmarks.",
    "how to identify financial scams": "Be cautious of unsolicited offers, verify sources, and avoid schemes promising guaranteed high returns.",
    "what is a debt-to-income ratio": "Debt-to-income ratio is the percentage of your monthly income that goes toward paying debts, affecting loan eligibility.",
    "how to increase your savings rate": "Automate savings, cut unnecessary expenses, and allocate a higher percentage of your income to savings.",
    "what is a credit freeze": "A credit freeze restricts access to your credit report, preventing identity thieves from opening accounts in your name.",
    "how to reduce financial stress": "Create a budget, build an emergency fund, and prioritize paying off high-interest debt.",
    "what is a debt snowball method": "The debt snowball method involves paying off the smallest debts first while making minimum payments on larger debts.",
    "how to refinance a mortgage": "Refinancing a mortgage means replacing your existing loan with a new one at a lower interest rate or better terms.",
    "what is a bear market": "A bear market is when stock prices decline by 20% or more over a sustained period, often due to economic downturns.",
    "how to prepare for unexpected expenses": "Set aside emergency savings, diversify income sources, and maintain a flexible budget.",
    "what is the difference between simple and compound interest": "Simple interest is calculated only on the principal, while compound interest earns interest on both the principal and accumulated interest.",
    "how to pay off a car loan faster": "Make extra payments, round up monthly payments, and refinance at a lower interest rate.",
    "what is financial independence": "Financial independence means having enough savings and passive income to cover living expenses without needing a job.",
    "how to avoid impulse spending": "Make a shopping list, set a waiting period before purchases, and track spending habits.",
    "what is a personal financial statement": "A personal financial statement summarizes your assets, liabilities, income, and expenses to assess financial health.",
    "how to start a retirement fund": "Open an IRA or 401(k), contribute regularly, and invest in diversified assets for long-term growth.",
    "what is a high-risk investment": "High-risk investments include stocks, cryptocurrencies, venture capital, and commodities with high potential returns but significant volatility.",
    "how to teach kids about money": "Give them an allowance, encourage saving, and teach them budgeting and the value of money.",
    "what is a secured credit card": "A secured credit card requires a deposit as collateral, helping people build or rebuild credit.",
    "how to avoid overdraft fees": "Track your balance, set up account alerts, and opt out of overdraft protection.",
    "what is a financial safety net": "A financial safety net includes emergency savings, insurance, and diversified income streams to protect against unexpected events.",
    "how to handle a financial crisis": "Assess your situation, cut unnecessary expenses, prioritize essential bills, and seek additional income sources.",
    "what is the FIRE movement": "FIRE (Financial Independence, Retire Early) is a lifestyle focused on high savings and investing aggressively to retire early.",
    "how to improve financial discipline": "Set clear financial goals, automate savings, and track expenses consistently.",
    "what is a cash flow statement": "A cash flow statement shows how money moves in and out of a business or personal finances over time.",
    "how to avoid paycheck-to-paycheck living": "Build an emergency fund, increase savings, and reduce unnecessary expenses.",
    "what is a bond yield": "Bond yield is the return an investor earns from a bond, calculated as interest payments relative to its price.",
    "how to achieve financial goals faster": "Increase income, cut expenses, and invest wisely to accelerate financial progress.",
    "what is tax-loss harvesting": "Tax-loss harvesting involves selling investments at a loss to offset taxable capital gains and reduce tax liability.",
    "how to invest in REITs": "Invest in publicly traded Real Estate Investment Trusts (REITs) through brokerage accounts or ETFs.",
    "what is a hedge fund": "A hedge fund is an investment fund that uses advanced strategies to generate high returns for wealthy investors.",
    "how to leverage credit responsibly": "Use credit for necessary expenses, pay off balances in full, and avoid excessive debt.",
    "what is a sinking fund": "A sinking fund is money saved for a specific future expense, like car repairs or vacations.",
    "how to track net worth over time": "Update asset and liability values regularly to monitor financial growth.",
    "what is an adjustable-rate mortgage (ARM)": "An ARM has an interest rate that changes periodically based on market conditions.",
    "how to create a financial plan": "Set goals, assess current finances, budget, invest, and review progress regularly.",
    "what is estate tax": "Estate tax is a tax on the transfer of a deceased person’s assets to their heirs.",
    "how to manage seasonal income": "Save during peak income periods, budget for slow months, and diversify income sources.",
    "what is a reverse mortgage": "A reverse mortgage allows seniors to convert home equity into cash without monthly payments.",
    "how to qualify for a mortgage": "Maintain a high credit score, save for a down payment, and show stable income history.",
    "what is an expense ratio in investing": "An expense ratio is the annual fee charged by investment funds, impacting overall returns.",
    "how to protect assets from inflation": "Invest in assets like real estate, stocks, and inflation-protected securities to maintain value.",
    "what is crowdfunding": "Crowdfunding is raising money from multiple people, typically online, to fund a project or business.",
    "how to become a millionaire": "Save consistently, invest wisely, avoid debt, and build multiple income streams.",
    "what is an investment portfolio": "An investment portfolio is a collection of assets like stocks, bonds, and real estate tailored to financial goals.",
    "how to live below your means": "Spend less than you earn, avoid debt, and prioritize needs over wants.",
    "what is economic downturn": "An economic downturn is a period of declining economic activity, leading to job losses and lower consumer spending.",

    
};

app.post("/chat", (req, res) => {
    const userMessage = req.body.message.toLowerCase();
    const response = responses[userMessage] || "I'm not sure about that. Try asking a different finance-related question!";
    res.json({ reply: response });
});

// ✅ Get User's Dashboard Data
app.get("/api/dashboard/user-data", verifyToken, async (req, res) => {
    try {
        // Fetch total income & total expenses
        const [incomeResult] = await db.promise().query("SELECT SUM(amount) AS totalIncome FROM income WHERE userId = ?", [req.user.id]);
        const [expenseResult] = await db.promise().query("SELECT SUM(amount) AS totalExpense FROM expenses WHERE userId = ?", [req.user.id]);

        const totalIncome = incomeResult[0].totalIncome || 0;
        const totalExpense = expenseResult[0].totalExpense || 0;
        const balance = totalIncome - totalExpense;

        res.status(200).json({ totalIncome, totalExpense, balance });
    } catch (error) {
        console.error("❌ Error fetching dashboard data:", error);
        res.status(500).json({ error: "Server error!" });
    }
});

// ✅ Fetch Detailed Financial Data
app.get("/api/dashboard/data", verifyToken, async (req, res) => {
    try {
        const [incomeData] = await db.promise().query("SELECT * FROM income WHERE userId = ?", [req.user.id]);
        const [expenseData] = await db.promise().query("SELECT * FROM expenses WHERE userId = ?", [req.user.id]);

        res.status(200).json({ income: incomeData, expenses: expenseData });
    } catch (error) {
        console.error("❌ Error fetching detailed data:", error);
        res.status(500).json({ error: "Server error!" });
    }
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
