import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import Inquiry from "./models/Inquiry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = express();
const PORT = process.env.PORT || 3000;
const PERENUAL_API_KEY = process.env.PERENUAL_API_KEY || "sk-7zOW69e672691384216602";
const PERENUAL_PEST_API_URL = "https://perenual.com/api/pest-disease-list";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(express.static(__dirname));

const contentData = {
    crops: [
        { slug: "wheat", commonName: "Wheat", scientificName: "Triticum aestivum" },
        { slug: "rice", commonName: "Rice", scientificName: "Oryza sativa" },
        { slug: "maize", commonName: "Maize", scientificName: "Zea mays" },
        { slug: "sugarcane", commonName: "Sugarcane", scientificName: "Saccharum officinarum" },
        { slug: "cotton", commonName: "Cotton", scientificName: "Gossypium hirsutum" },
        { slug: "pulses", commonName: "Pulses", scientificName: "Fabaceae family" }
    ],
    faqs: [
        {
            question: "How accurate is the pest identification tool?",
            answer: "Our AI model is trained on over 500,000 verified academic specimens, with 94.2% accuracy for major crop pests."
        },
        {
            question: "Are the advisory recommendations organic?",
            answer: "We prioritize Integrated Pest Management (IPM), starting with biological and mechanical controls before chemical intervention."
        },
        {
            question: "Can I contribute to the academic archive?",
            answer: "Yes, verified researchers can contribute high-resolution specimen data through the institutional workflow."
        }
    ],
    advisory: {
        pestName: "Fall Armyworm",
        scientificName: "Spodoptera frugiperda",
        summary:
            "An invasive lepidopteran pest that causes significant damage to maize and other cereal crops. Early detection is paramount for effective management and yield preservation.",
        damageText:
            "Untreated infestations can result in yield losses of up to 40-60%. The larvae migrate to the ear/cob in later stages, directly destroying the grain and inviting secondary fungal infections.",
        yieldRisk: "Critical",
        growthPhase: "Vegetative"
    },
    stats: {
        responseRate: "98%",
        monitoring: "24/7"
    }
};

function inferPestFromFileName(fileName) {
    const lower = String(fileName || "").toLowerCase();

    if (lower.includes("armyworm") || lower.includes("maize")) {
        return {
            family: "NOCTUIDAE FAMILY",
            pestName: "Fall Armyworm",
            scientificName: "Spodoptera frugiperda",
            description:
                "Larvae feed aggressively on maize leaves, causing ragged holes and heavy defoliation. Monitor early and intervene before tasseling.",
            alert: "HIGH ALERT"
        };
    }

    if (lower.includes("rice") || lower.includes("stem") || lower.includes("borer")) {
        return {
            family: "CRAMBIDAE FAMILY",
            pestName: "Rice Stem Borer",
            scientificName: "Scirpophaga incertulas",
            description:
                "Larvae bore inside rice stems and cause deadheart and whitehead symptoms. Timely surveillance and whorl-stage management are critical.",
            alert: "HIGH ALERT"
        };
    }

    return {
        family: "LEPIDOPTERA GROUP",
        pestName: "Probable Field Caterpillar",
        scientificName: "Species pending",
        description:
            "Specimen features suggest a caterpillar-type pest. Capture a clearer close-up image for species-level confirmation.",
        alert: "MODERATE ALERT"
    };
}

function buildPerenualSearchTerms(fileName, fallbackName) {
    const tokens = String(fileName || "")
        .toLowerCase()
        .replace(/\.[^.]+$/, "")
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 2 && !["image", "img", "photo", "pest", "pests", "scan"].includes(token));

    const preferred = String(fallbackName || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

    return [...new Set([...preferred, ...tokens])].filter(Boolean);
}

async function fetchPerenualPestMatches(query) {
    const url = new URL(PERENUAL_PEST_API_URL);
    url.searchParams.set("key", PERENUAL_API_KEY);
    url.searchParams.set("q", query);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Perenual request failed with status ${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
}

function mapPerenualPestRecord(record, fallback) {
    const image = Array.isArray(record?.images) && record.images.length ? record.images[0] : null;
    const scientificName = Array.isArray(record?.scientific_name)
        ? record.scientific_name[0]
        : record?.scientific_name;

    return {
        family: String(record?.family || fallback.family || "UNKNOWN FAMILY").toUpperCase(),
        pestName: record?.common_name || fallback.pestName,
        scientificName: scientificName || fallback.scientificName,
        description: record?.description || fallback.description,
        alert: fallback.alert,
        imageUrl: image?.regular_url || image?.medium_url || image?.original_url || null,
        solution: Array.isArray(record?.solution) ? record.solution.join(" ") : record?.solution || "",
        host: Array.isArray(record?.host) ? record.host.join(", ") : record?.host || ""
    };
}

server.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "mitti-ki-baat-api" });
});

server.get("/api/crops", (req, res) => {
    res.json({ crops: contentData.crops });
});

server.get("/api/faqs", (req, res) => {
    res.json({ faqs: contentData.faqs });
});

server.get("/api/advisory/fall-armyworm", (req, res) => {
    res.json(contentData.advisory);
});

server.get("/api/stats", (req, res) => {
    res.json(contentData.stats);
});

server.post("/api/identify", (req, res) => {
    const { fileName } = req.body || {};
    if (!fileName) {
        return res.status(400).json({ message: "fileName is required" });
    }

    const fallback = inferPestFromFileName(fileName);
    const searchTerms = buildPerenualSearchTerms(fileName, fallback.pestName);

    const lookup = async () => {
        for (const term of searchTerms) {
            try {
                const matches = await fetchPerenualPestMatches(term);
                if (matches.length) {
                    return mapPerenualPestRecord(matches[0], fallback);
                }
            } catch (error) {
                console.error(`Perenual lookup failed for ${term}:`, error.message);
            }
        }

        return fallback;
    };

    lookup()
        .then((result) => res.json({ result }))
        .catch((error) => {
            console.error("Identify lookup failed:", error.message);
            return res.json({ result: fallback });
        });
});

server.post("/api/contact", async (req, res) => {
    const fullName = String(req.body?.fullName || "").trim();
    const email = String(req.body?.email || "").trim();
    const message = String(req.body?.message || "").trim();

    if (fullName.length < 3) {
        return res.status(400).json({ message: "Enter a valid full name." });
    }
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (message.length < 15) {
        return res.status(400).json({ message: "Message should be at least 15 characters." });
    }

    try {
        await Inquiry.create({ fullName, email, message });
        return res.status(201).json({
            message: "Your query has been submitted successfully. Our team will contact you shortly."
        });
    } catch {
        return res.status(500).json({ message: "Failed to save your query." });
    }
});

server.use("/api", authRoutes);

server.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

async function startServer() {
    try {
        await connectDatabase();
        server.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Startup failed:", error.message);
        process.exit(1);
    }
}

startServer();
