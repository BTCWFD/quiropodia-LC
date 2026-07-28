require('dotenv').config();
const ftp = require("basic-ftp");
const path = require("path");

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    const files = [
        { local: "admin.php", remote: "admin.php" },
        { local: path.join("api", "admin_citas.php"), remote: "api/admin_citas.php" },
        { local: "admin_config.php", remote: "admin_config.php" },
        { local: ".htaccess", remote: ".htaccess" },
    ];

    try {
        console.log("Conectando al FTP de Hostinger...");
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: true,
            secureOptions: { rejectUnauthorized: false }
        });

        try {
            await client.cd("public_html");
            console.log("En public_html.");
        } catch (e) {
            console.log("Nota: probablemente el FTP ya nos ubicó en la raíz correcta.");
        }

        for (const f of files) {
            console.log(`Subiendo: ${f.local} -> ${f.remote}`);
            await client.ensureDir(path.dirname(f.remote));
            await client.cd("/");
            try { await client.cd("public_html"); } catch (e) {}
            await client.uploadFrom(path.join(__dirname, f.local), f.remote);
        }

        console.log("✅ Listo. Los 4 archivos se subieron.");
    } catch (err) {
        console.error("❌ Error durante el despliegue:", err);
    }
    client.close();
}

deploy();
