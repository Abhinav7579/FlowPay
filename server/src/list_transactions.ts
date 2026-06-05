import client from "./prismaclient.js";

async function main() {
    try {
        const txns = await client.transaction.findMany({
            orderBy: {
                createdAt: "desc"
            },
            include: {
                product: true
            }
        });
        console.log("TRANSACTIONS IN DATABASE:");
        txns.forEach(t => {
            console.log(`ID: ${t.id.substring(0,8)} | Amount: ${t.totalAmount} | Status: ${t.status} | CreatedAt: ${t.createdAt.toISOString()} | Product: ${t.product?.name}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await client.$disconnect();
    }
}

main();
