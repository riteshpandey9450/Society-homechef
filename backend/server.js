const http = require("http");
const app = require("./src/app");
const { initSocket } = require("./src/socket");
const connectDB = require("./src/config/db");
require("dotenv").config();

const PORT = process.env.PORT || 5000;

connectDB();

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Society HomeChef server running on port ${PORT}`);
});
