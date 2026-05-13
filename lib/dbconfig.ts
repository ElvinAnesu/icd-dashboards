//import sql from "mssql";

const  isDev = false;

const config = {
    user: isDev ? "stackwise_user" : "manager_user",
    password: isDev ? "(@stackwise01)" : "(@Hesu@123)",
    server: isDev ? "103.142.175.103" : "77.235.34.29",
    database: isDev ? "BT_HESUICD_LIVE_TRAINING" : "BT_HESUICD_LIVE",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

export default config;
