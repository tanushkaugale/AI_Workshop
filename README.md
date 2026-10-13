# Sanjivani Sugar Factory - AI MCP Application

A minimal, educational TypeScript application demonstrating how to build an **MCP Server** and **MCP Client** using the official `@modelcontextprotocol/sdk` and **OpenAI Function Calling**, backed by **PostgreSQL**.

---

## 📁 Project Structure

```text
MCP/
├── schema.sql         # SQL script to create table & insert 10 sample farmers
├── server.ts          # MCP Server: connects to Postgres & exposes 1 MCP tool
├── client.ts          # MCP Client: asks question to OpenAI, executes tool call
├── .env               # Your local credentials (OpenAI key + Postgres password)
├── package.json       # Project dependencies & scripts
└── tsconfig.json      # TypeScript configuration
```

---

## 🚀 Quick Setup Guide

### 1. Database Setup in pgAdmin
1. Open **pgAdmin** and connect to your PostgreSQL server.
2. Create a new database named **`sanjivani_db`** (or use an existing one).
3. Open the **Query Tool** on `sanjivani_db` and execute the contents of `schema.sql`:
   ```sql
   CREATE TABLE IF NOT EXISTS farmers (
       id SERIAL PRIMARY KEY,
       name VARCHAR(100) NOT NULL,
       village VARCHAR(100) NOT NULL,
       sugarcane_supply_tons NUMERIC(10, 2) NOT NULL,
       amount_paid NUMERIC(12, 2) NOT NULL,
       payment_pending NUMERIC(12, 2) NOT NULL,
       factory_name VARCHAR(100) DEFAULT 'Sanjivani Sugar Factory'
   );

   INSERT INTO farmers (name, village, sugarcane_supply_tons, amount_paid, payment_pending) VALUES
   ('Ramesh Patil', 'Kopargaon', 120.50, 300000.00, 61500.00),
   ('Suresh Deshmukh', 'Kolpewadi', 95.00, 250000.00, 35000.00),
   ('Dnyaneshwar Shinde', 'Puntamba', 150.25, 400000.00, 50750.00),
   ('Tukaram Pawar', 'Shirdi', 80.00, 200000.00, 40000.00),
   ('Babasaheb Kale', 'Rahata', 210.00, 550000.00, 80000.00),
   ('Sanjay Jadhav', 'Pohegaon', 115.75, 300000.00, 47250.00),
   ('Ashok Ghadge', 'Yesgaon', 70.00, 180000.00, 30000.00),
   ('Vitthal Thorat', 'Chande', 185.50, 480000.00, 76500.00),
   ('Eknath Jagtap', 'Savalyavihar', 130.00, 350000.00, 40000.00),
   ('Balasaheb Vikhe', 'Shirasgaon', 160.00, 420000.00, 60000.00);
   ```

### 2. Configure Credentials in `.env`
Update `.env` with your real PostgreSQL password and OpenAI API key:
```env
OPENAI_API_KEY=sk-...your-real-key...
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=sanjivani_db
```

### 3. Run the Application
Run the client with one single command:
```bash
npm start
```

---

## 🧠 How MCP Works Under The Hood

```text
+-----------------------------------------------------------+
|                        client.ts                          |
|  1. Discovers tools from server.ts over Stdio             |
|  2. Sends hardcoded question + tool definitions to OpenAI |
|  3. OpenAI decides to call tool: "get_sanjivani_farmers"  |
|  4. Client requests MCP Server to execute the tool        |
+-----------------------------+-----------------------------+
                              |
                     Stdio Transport
                              |
                              v
+-----------------------------------------------------------+
|                        server.ts                          |
|  1. Receives tool invocation: "get_sanjivani_farmers"     |
|  2. Runs SQL query on PostgreSQL (farmers table)          |
|  3. Returns raw farmer records as JSON back to Client     |
+-----------------------------------------------------------+
                              |
                     Stdio Transport
                              |
                              v
+-----------------------------------------------------------+
|                        client.ts                          |
|  5. Forwards JSON tool output to OpenAI                   |
|  6. OpenAI synthesizes human-readable final response      |
+-----------------------------------------------------------+
```

