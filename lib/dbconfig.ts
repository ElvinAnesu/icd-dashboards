//import sql from "mssql";

const config = {
  user: "stackwise_user",
  password: "(@stackwise01)",
  server: "103.142.175.103",
  database: "BT_HESUICD_LIVE_TRAINING",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

export default config;
