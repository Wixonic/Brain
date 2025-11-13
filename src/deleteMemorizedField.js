import lancedb from "@lancedb/lancedb";
import os from "os";
import path from "path";

const main = async (id) => {
	const db = await lancedb.connect(path.join(os.homedir(), "Brain"));
	const table = await db.openTable("memory");

	await table.delete(`id = '${id}'`);
};

main(process.argv[2]);