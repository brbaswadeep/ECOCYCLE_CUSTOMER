/**
 * Utility to identify prohibited hazardous items (Medical, Explosives/Bombs, Weapons, Toxic/Chemicals)
 * to prevent them from being accepted or processed for recycling or upcycling.
 */

const HAZARDOUS_RULES = [
    {
        category: "Explosives & Munitions Prohibited",
        type: "explosive",
        regex: /\b(bomb|bombs|bomba|bombas|explosive|explosives|dynamite|grenade|grenades|gunpowder|tnt|c4|rdx|detonator|firework|fireworks|firecracker|firecrackers|pyrotechnic|pyrotechnics|ammunition|ammo|bullet|bullets|cartridge|cartridges|missile|landmine|mortar|artillery|ied|blasting cap)\b/i,
        reason: "Explosives, bombs, ammunition, fireworks, and munitions pose immediate severe danger and are strictly forbidden from scanning or recycling.",
        guidance: "Please alert your local emergency services or bomb disposal unit immediately. Do NOT touch, handle, or transport explosive materials."
    },
    {
        category: "Medical & Clinical Waste Prohibited",
        type: "medical",
        regex: /\b(medical|hospital|clinical|syringe|syringes|needle|needles|hypodermic|scalpel|scalpels|surgical|sharps|blood|bandage|bandages|gauze|catheter|iv bag|iv drip|saline bag|medicine|medicines|medication|medications|pharmaceutical|pharmaceuticals|tablet|tablets|capsule|capsules|pill|pills|insulin|vaccine|vaccines|vial|vials|ampoule|ampoules|biohazard|infectious|pathology|pathological)\b/i,
        reason: "Medical waste, syringes, pharmaceuticals, and clinical items carry severe biological and biohazard infection risks and cannot be processed by scrap vendors.",
        guidance: "Dispose of medical items strictly at authorized hospital bins or certified biomedical waste treatment centers. Never mix medical waste with regular recyclables."
    },
    {
        category: "Weapons & Firearms Prohibited",
        type: "weapon",
        regex: /\b(gun|guns|pistol|pistols|revolver|revolvers|rifle|rifles|shotgun|shotguns|firearm|firearms|handgun|handguns|assault rifle|submachine|magazine clip|taser|dagger|switchblade)\b/i,
        reason: "Firearms, weapons, and ammunition components are strictly restricted and cannot be accepted, scanned, or traded on the platform.",
        guidance: "Surrender unwanted firearms or regulated weapons to your nearest police station or licensed authority according to national regulations."
    },
    {
        category: "Toxic Chemicals & Radioactive Materials Prohibited",
        type: "toxic",
        regex: /\b(acid|acids|sulphuric acid|sulfuric acid|hydrochloric acid|nitric acid|poison|poisons|poisonous|pesticide|pesticides|insecticide|insecticides|rodenticide|cyanide|arsenic|mercury|asbestos|radioactive|radiation|uranium|plutonium|nuclear)\b/i,
        reason: "Hazardous chemicals, concentrated acids, agricultural pesticides, and radioactive materials present catastrophic health and environmental contamination hazards.",
        guidance: "Contact your municipal hazardous waste management facility or authorized chemical disposal operator for safe neutralization and disposal."
    }
];

/**
 * Checks text or object description against hazardous keywords.
 * @param {string} text - text to inspect
 * @returns {object|null} - returns match info or null if safe
 */
export function checkHazardousWaste(text) {
    if (!text || typeof text !== 'string') return null;

    const trimmed = text.trim();
    if (!trimmed) return null;

    for (const rule of HAZARDOUS_RULES) {
        if (rule.regex.test(trimmed)) {
            return {
                isHazardous: true,
                category: rule.category,
                reason: rule.reason,
                guidance: rule.guidance,
                type: rule.type
            };
        }
    }

    return null;
}

export const PROHIBITED_HAZARDOUS_CATEGORIES = [
    {
        title: "Medical & Biohazard",
        examples: "Syringes, needles, medicines, blood bags, IV sets, pharmaceuticals",
        icon: "syringe"
    },
    {
        title: "Explosives & Bombs",
        examples: "Bombs, fireworks, firecrackers, ammunition, dynamite, gunpowder",
        icon: "bomb"
    },
    {
        title: "Weapons & Firearms",
        examples: "Guns, pistols, rifles, firearm parts, cartridge casings",
        icon: "shield-alert"
    },
    {
        title: "Toxic Chemicals",
        examples: "Concentrated acids, pesticides, poisons, asbestos, radioactive scrap",
        icon: "skull"
    }
];
