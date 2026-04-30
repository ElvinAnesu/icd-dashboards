import sql from "mssql";
import config from "@/lib/dbconfig";

export async function GET() {
  try {
    await sql.connect(config);

    const result = await sql.query(`
      SELECT *
      FROM INV1
    `);

    return Response.json(result.recordset);
  } catch (err: any) {
    return Response.json({ error: err.message });
  }
}
