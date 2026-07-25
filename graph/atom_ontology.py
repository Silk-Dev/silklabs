"""
v0.4.0-alpha: Typed Atom Ontology
Maps the 325 flat tags into 7 typed categories for the Genome Engine.

Types: industry, business_model, delivery, technology, labor_model, revenue_model, regulatory

This mapping is the single source of truth for tag → type assignment.
No tag may belong to more than one type.
"""
import json
import re
from collections import Counter

# ── Atom type definitions ─────────────────────────────────────────────
# Each tag appears in exactly one list. No duplicates across types.

ATOM_TYPE_MAP: dict[str, list[str]] = {
    "industry": [
        # Healthcare & Biotech
        "Healthcare", "Health Tech", "Healthcare IT", "Health & Wellness",
        "Synthetic Biology",
        "Telemedicine", "Primary Care",
        "Elder Care",
        "Pediatrics",
        "Mental Health",
        "Veterinary",
        "Dental",
        "Vision Care",
        "Medical Devices",
        "Diagnostics",
        "Alternative Medicine",
        "Food Science", "Alt Protein",
        "Pharmaceuticals", "Drug Discovery", "Therapeutics",
        # Fintech
        "Fintech", "Finance", "Consumer Finance", "Lending", "Investing",
        "Stocks", "Trading", "Art Trading Platforms",
        "Emerging Markets", "Conversational Banking",
        "Banking", "Neobank",
        "Payments", "Billing", "Cross-border",
        # Insurance
        "Insurance",
        # Education
        "Education", "Edtech", "eLearning", "Coding Bootcamps",
        # Media & Entertainment
        "Media", "Entertainment", "Content", "Creator Economy",
        "Gaming", "Cloud Gaming", "eSports",
        "Video", "Music", "Podcasting", "Streaming",
        "Publishing", "News",
        "Sports",
        "Beauty", "Cosmetics",
        # Advertising
        "Advertising", "Marketing", "Adtech",
        # Commerce
        "Commerce", "Retail Tech", "E-commerce",
        "Automotive Commerce",
        # Consumer
        "Consumer", "Consumer Products", "Consumer Health Services",
        "Home Services",
        "Food & Beverage", "Food",
        "Fashion & Apparel", "Fashion", "Apparel",
        "Pet Care",
        "Hospitality",
        "Wellness", "Fitness",
        "Travel & Booking", "Travel",
        "Real Estate & Construction", "Real Estate", "Property Tech",
        # Enterprise
        "Enterprise", "Enterprise Software", "SMB",
        "SaaS",
        # HR
        "Human Resources", "Recruiting", "Talent Acquisition", "Careers",
        # Legal
        "Legal", "LegalTech",
        # Government
        "GovTech", "Civic Tech", "Gov & Civic",
        "Nonprofit", "Social Impact",
        "Diversity & Inclusion",
        # Security
        "Security", "Privacy", "Infosec",
        "Cybersecurity", "Defense",
        # Energy & Climate
        "Energy", "Renewable Energy", "Solar Power", "Fusion Energy",
        "Hydrogen Energy", "Alternative Fuels", "Small Modular Reactors",
        "Climate", "ClimateTech", "Carbon Capture and Removal",
        "Sustainability", "Sustainable Tourism", "Weather",
        "Clean Energy Storage",
        # Agriculture
        "Agriculture", "AgTech",
        # Transportation & Logistics
        "Logistics", "Supply Chain", "Last Mile Delivery",
        "Transportation", "Mobility",
        "Automotive",
        "Space", "Aerospace", "Space Travel",
        # Industrial
        "Manufacturing",
        "Industrial",
        "Mining",
        "Fisheries",
        "Forestry",
        "Water",
        "Waste Management",
        "Construction",
        # Telecom
        "Telecom", "Telecommunications",
        # Other
        "Emergency Response",
        "Funeral Tech",
        "Gambling",
        "Alcohol",
        "Cannabis",
        "Future of Work",
        "Remote Work",
        # Subcategories that are really industry-level
        "Nanotech",
        "Material Science", "Advanced Materials",
            # Additional tags from hierarchy
        "3D Printed Foods",
        "Air Taxis",
        "Airlines",
        "Airplanes",
        "Anti-aging",
        "Architecture",
        "Bioplastic",
        "Biotechnology",
        "Booking",
        "CRISPR",
        "Cell Therapy",
        "Cellular Agriculture",
        "Commercial Space Launch",
        "Covid-19",
        "Cultivated Meat",
        "Culture",
        "Customer Service",
        "Cyber Insurance",
        "Dating",
        "Drug Delivery",
        "Election Tech",
        "Electric Vehicles",
        "Energy Storage",
        "Femtech",
        "Fertility Tech",
        "Food Tech",
        "Fundraising",
        "Furniture",
        "Gardening",
        "Gene Therapy",
        "Genetic Engineering",
        "Genomics",
        "Ghost Kitchens",
        "Grocery",
        "Health Insurance",
        "Housing",
        "Immigration",
        "International",
        "Livestock Health",
        "Maritime",
        "Market Research",
        "Mental Health Tech",
        "Microinsurance",
        "Oncology",
        "Payroll",
        "Plant-based Meat",
        "Podcasts",
        "Procurement",
        "Proptech",
        "Psychedelics",
        "Remittances",
        "Restaurant Tech",
        "Reviews",
        "Ridesharing",
        "Rocketry",
        "Sales",
        "Sales Enablement",
        "Skincare",
        "Sleep Tech",
        "Smart Waste Management",
        "Space Exploration",
        "Sustainable Agriculture",
        "Sustainable Fashion",
        "Ticketing",
        "VR Health",
        "Vertical Farming",
        "Women's Health",
        "Alternative Battery Tech",
        "Call Center",
        "Community",
        "Customer Success",
],

    "business_model": [
        "B2B", "B2C", "B2B2C", "B2G",
        "Marketplace", "Two-sided Marketplace",
        "Freemium",
        "Direct-to-Consumer", "D2C",
        "Wholesale",
        "Retail",
        "Agency",
        "Consulting",
        "Cooperative",
        "Open Source",
        "White Label",
        "Bundled",
        "P2P",
        "Referrals",
            # Additional tags from hierarchy
        "Crowdfunding",
],

    "delivery": [
        "On-demand", "On Demand",
        "Delivery",
        "Scheduled",
        "Autonomous", "Autonomous Delivery", "Autonomous Trucking", "Autonomous Shipping",
        "Physical",
        "Digital", "Digital Health",
        "Hybrid",
        "Self-serve", "Self Serve",
        "Appointment-based",
        "Subscription Box",
        "Live",
        "Async",
        "Real-time",
        "Telehealth",
],

    "technology": [
        "AI", "Artificial Intelligence", "AI Assistant",
        "Conversational AI", "Generative AI",
        "Large Language Models", "LLM",
        "Machine Learning", "Deep Learning", "ML", "Reinforcement Learning",
        "NLP", "Natural Language Processing", "Speech Recognition",
        "Chatbot", "Chatbots",
        "Computer Vision",
        "Computer Vision & XR", "XR",
        "AR", "VR", "Augmented Reality", "Virtual Reality",
        "Robotics", "Robotic Surgery", "Swarm Robotics",
        "Medical Robotics",
        "Drones", "Unmanned Vehicle",
        "Self-Driving Vehicles", "Autonomous Vehicles",
        # No duplicates with delivery list
        "App", "Mobile App",
        "Web", "Web Development",
        "Voice",
        "IoT", "Internet of Things",
        "Blockchain", "Crypto", "Web3", "Smart Contracts",
        "Hardware", "Electronics", "Hard Tech",
        "Semiconductors", "Edge Computing Semiconductors",
        "Edge Computing",
        "Quantum Computing",
        "3D Printing", "Additive Manufacturing",
        "Robotic Process Automation",
        "Data Science", "Data Analytics", "Analytics",
        "Big Data",
        "Database",
        "Cloud", "Cloud Computing", "Cloud Workload Protection",
        "DevOps", "DevOps & Infrastructure",
        "Infrastructure",
        "Kubernetes",
        "GraphQL",
        "No-code", "Low-code",
        "API",
        "Developer Tools",
        "Design Tools",
        "Biometrics",
        "Identity",
        "Search",
        "Recommendation",
        "CRM",
        "CRM & Sales",
        "ERP",
        "Payments Infrastructure",
        "Banking as a Service",
        "HR Tech",
        "HR & Recruiting",
        "Fraud & Security",
        # Domain tech (no duplicates with industry list)
        "Biotech",
        # Emerging
        "Food Service Robots & Machines",
        "Digital Freight Brokerage",
        "Warehouse Management Tech",
            # Additional tags from hierarchy
        "AI-enhanced Learning",
        "AI-powered Drug Discovery",
        "AIOps",
        "Application Performance Monitoring",
        "Assistive Tech",
        "Automation",
        "Batteryless IoT Sensors",
        "Calendar",
        "Cashierless Checkout",
        "Chat",
        "Collaboration",
        "Computational Storage",
        "Crowdsourcing",
        "Crypto / Web3",
        "Cryptocurrency",
        "Cryptography",
        "Customer Support",
        "DAO",
        "Data Engineering",
        "Data Labeling",
        "Data Visualization",
        "Databases",
        "DeFi",
        "Deepfake Detection",
        "Design",
        "DevSecOps",
        "Documents",
        "Email",
        "Feedback",
        "FinOps",
        "Fraud Detection",
        "Fraud Prevention",
        "Geographic Information System",
        "Home Automation",
        "Indoor Mapping",
        "Industrial Workplace Safety",
        "IoT Security",
        "Lab-on-a-Chip",
        "LiDAR",
        "Location-based",
        "Messaging",
        "Metaverse",
        "Microfluidics",
        "Monitoring",
        "NFT",
        "Nanomedicine",
        "Nanosensors",
        "Nanotechnology",
        "Navigation",
        "Networks",
        "Neurotechnology",
        "Next-gen Network Security",
        "Note-taking",
        "Notifications",
        "Operations",
        "Personalization",
        "Productivity",
        "Radar",
        "Recommendation System",
        "SEO",
        "SMS",
        "Satellites",
        "Scheduling",
        "Security Orchestration, Automation and Response (SOAR)",
        "Smart Clothing",
        "Smart Home Assistants",
        "Smart Locks",
        "Social",
        "Social Media",
        "Social Network",
        "Team Collaboration",
        "Time Series",
        "Workflow Automation",
        "Customization",
],

    "labor_model": [
        "Gig Economy", "Gig",
        "Freelance",
        "Full-time",
        "Part-time",
        "Seasonal",
        "Contract",
        "Volunteer",
        "Crowdsourced",
        "Automated",
        "Staffing",
        "Labor Marketplace",
        "Co-working",
        "Remote",
        "On-site",
    ],

    "revenue_model": [
        "Transaction Fee",
        "Subscription", "Subscriptions",
        "Ad-supported",
        "Licensing",
        "Hardware Margin",
        "Commission",
        "Markup",
        "Rental",
        "Lease",
        "Service Fee",
        "Data Monetization",
        "Franchise Fee",
        "Management Fee",
        "Referral",
        "Per-use",
        "Tiered",
        "Income Share Agreements",
],

    "regulatory": [
        "FDA", "FDA Approval",
        "Fintech Regulation", "Fintech License",
        "Aviation",
        "GDPR",
        "HIPAA",
        "Zoning",
        "Alcohol License",
        "Gambling License",
        "Cannabis License",
        "SEC",
        "CFTC",
        "Patent",
        "Data Privacy",
        "Export Control",
        "ITAR",
        "ISO Certification",
        "Organic Certification",
        "Building Code",
        "Food Safety",
        "OSHA",
        "Environmental",
        "Carbon Credit",
        "Regtech",
        "Compliance",
        "Defense Regulation",
            # Additional tags from hierarchy
        "Trust & Safety",
],
}


def build_atom_mapping() -> dict[str, str]:
    """
    Build a flat mapping from each known tag name to its atom type.
    Returns: { "healthcare": "industry", "b2b": "business_model", ... }
    """
    mapping: dict[str, str] = {}
    for atom_type, tags in ATOM_TYPE_MAP.items():
        for tag in tags:
            canonical = tag.strip().lower()
            if canonical in mapping:
                raise ValueError(
                    f"DUPLICATE TAG '{tag}' in both '{mapping[canonical]}' and '{atom_type}'."
                    f" Remove one."
                )
            mapping[canonical] = atom_type
    return mapping


def tag_to_atom(tag: str, mapping: dict[str, str]) -> tuple[str, str] | None:
    """Convert a raw tag string to (normalized_atom_name, atom_type) or None if unmapped."""
    canonical = tag.strip().lower()
    atom_type = mapping.get(canonical)
    if atom_type is None:
        return None
    atom_name = canonical.replace(" ", "_").replace("-", "_").replace("&", "and")
    atom_name = re.sub(r"[^a-z0-9_]", "", atom_name)
    atom_name = re.sub(r"_+", "_", atom_name).strip("_")
    return (atom_name, atom_type)


def save_ontology(mapping: dict[str, str], output_path: str = "graph/atom_ontology.json"):
    """Save the ontology as a JSON file for the pipeline."""
    ontology = {}
    for tag, atom_type in mapping.items():
        atom_name = tag.replace(" ", "_").replace("-", "_").replace("&", "and")
        atom_name = re.sub(r"[^a-z0-9_]", "", atom_name)
        atom_name = re.sub(r"_+", "_", atom_name).strip("_")
        if atom_name not in ontology:
            ontology[atom_name] = atom_type
    
    with open(output_path, "w") as f:
        json.dump(ontology, f, indent=2, sort_keys=True)
    print(f"Saved {len(ontology)} unique atom types to {output_path}")
    return ontology


if __name__ == "__main__":
    mapping = build_atom_mapping()
    print(f"Total mapped tags: {len(mapping)}")
    type_counts = Counter(mapping.values())
    for atype, count in type_counts.most_common():
        print(f"  {atype}: {count}")
    save_ontology(mapping)
    print("No duplicates. Ontology is clean.")
