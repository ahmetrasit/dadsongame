// ==========================================
// Ontology Registries
// Mapping forms, capabilities, and functional properties
// with their tiers and relationships
// ==========================================

import {
  Form,
  Capability,
  FunctionalProperty,
  FunctionalCategory,
  Tier,
} from '../types/ontology';

// ==========================================
// Forms Registry (30 forms)
// Maps forms to their tier and enabled capabilities
// ==========================================

export const FORMS_REGISTRY: Record<Form, {
  tier: Tier;
  enabledCapabilities: Capability[];
  description: string;
}> = {
  // Base Forms (20) - Tiers 1-3
  spike: {
    tier: 1,
    enabledCapabilities: ['can_pierce'],
    description: 'Sharp pointed form for piercing and puncturing',
  },
  blade: {
    tier: 1,
    enabledCapabilities: ['can_cut', 'can_scrape', 'can_dig'],
    description: 'Sharp-edged form for cutting and slicing',
  },
  wedge: {
    tier: 1,
    enabledCapabilities: ['can_wedge', 'can_dig'],
    description: 'Tapered form for splitting and prying',
  },
  rod: {
    tier: 1,
    enabledCapabilities: ['can_reach', 'can_lever', 'can_spin', 'can_support_weight', 'can_spring', 'can_conduct_heat'],
    description: 'Elongated solid form for leverage and reaching',
  },
  tube: {
    tier: 2,
    enabledCapabilities: ['can_channel', 'can_roll'],
    description: 'Hollow cylinder for channeling liquids or air',
  },
  sheet: {
    tier: 1,
    enabledCapabilities: ['can_wrap', 'can_seal', 'can_support_weight', 'can_float', 'can_insulate', 'can_reflect', 'can_conduct_heat'],
    description: 'Thin flat form for covering and wrapping',
  },
  bowl: {
    tier: 1,
    enabledCapabilities: ['can_contain_liquid', 'can_contain_solid', 'can_scoop', 'can_float'],
    description: 'Concave form for holding liquids and items',
  },
  box: {
    tier: 2,
    enabledCapabilities: ['can_contain_solid'],
    description: 'Multi-surfaced enclosure for storing and protecting',
  },
  wheel: {
    tier: 2,
    enabledCapabilities: ['can_roll', 'can_spin', 'can_grind'],
    description: 'Circular form for rolling and reducing friction',
  },
  ball: {
    tier: 3,
    enabledCapabilities: ['can_roll'],
    description: 'Spherical form for omnidirectional rolling',
  },
  ring: {
    tier: 2,
    enabledCapabilities: ['can_seal'],
    description: 'Circular form with central hole for connecting and sealing',
  },
  hook: {
    tier: 3,
    enabledCapabilities: ['can_hook'],
    description: 'Curved rigid form for catching and hanging',
  },
  frame: {
    tier: 3,
    enabledCapabilities: ['can_support_weight'],
    description: 'Connected rods enclosing space for structural support',
  },
  mesh: {
    tier: 2,
    enabledCapabilities: ['can_insulate', 'can_absorb'],
    description: 'Perforated form for filtering and airflow',
  },
  block: {
    tier: 1,
    enabledCapabilities: ['can_strike', 'can_grind'],
    description: 'Solid compact form for stacking and anchoring',
  },
  cord: {
    tier: 1,
    enabledCapabilities: ['can_bind'],
    description: 'Flexible elongated form for tying and binding',
  },
  hinge: {
    tier: 3,
    enabledCapabilities: [],
    description: 'Pivoting joint for rotational movement',
  },
  handle: {
    tier: 1,
    enabledCapabilities: ['can_grip'],
    description: 'Grippable attachment for control and force application',
  },
  platform: {
    tier: 2,
    enabledCapabilities: ['can_support_weight'],
    description: 'Flat supported surface for working and storage',
  },
  enclosure: {
    tier: 2,
    enabledCapabilities: ['can_contain_solid'],
    description: 'Multi-walled space for containment and shelter',
  },

  // Advanced Forms (10) - Tiers 2-5
  cone: {
    tier: 2,
    enabledCapabilities: ['can_amplify_sound'],
    description: 'Circular form tapering to point for sound amplification',
  },
  trough: {
    tier: 2,
    enabledCapabilities: ['can_channel'],
    description: 'Elongated open channel for directing flow',
  },
  saddle: {
    tier: 2,
    enabledCapabilities: ['can_support_weight'],
    description: 'Body-contoured form for riding and mounting',
  },
  bellows: {
    tier: 3,
    enabledCapabilities: ['can_pump'],
    description: 'Expandable chamber with valves for pumping air',
  },
  helix: {
    tier: 3,
    enabledCapabilities: ['can_thread', 'can_store_mechanical_energy'],
    description: 'Coiled form around axis for threading and energy storage',
  },
  valve: {
    tier: 3,
    enabledCapabilities: ['can_control_flow'],
    description: 'Movable obstruction for controlling flow',
  },
  gear: {
    tier: 4,
    enabledCapabilities: ['can_mesh'],
    description: 'Toothed wheel for mechanical power transfer',
  },
  cam: {
    tier: 4,
    enabledCapabilities: ['can_convert_motion'],
    description: 'Irregular wheel for motion conversion',
  },
  piston: {
    tier: 4,
    enabledCapabilities: ['can_convert_motion'],
    description: 'Rod in sealed cylinder for pressure transfer',
  },
  lens: {
    tier: 5,
    enabledCapabilities: ['can_focus'],
    description: 'Transparent curved surface for focusing light',
  },
};

// ==========================================
// Capabilities Registry (35 capabilities)
// Maps capabilities to their tier and required forms
// ==========================================

export const CAPABILITIES_REGISTRY: Record<Capability, {
  tier: Tier;
  requiredForms: Form[];
  description: string;
}> = {
  // Base Capabilities (23)
  can_cut: {
    tier: 1,
    requiredForms: ['blade'],
    description: 'Slice through materials with sharp edge',
  },
  can_pierce: {
    tier: 1,
    requiredForms: ['spike'],
    description: 'Puncture materials with pointed tip',
  },
  can_scrape: {
    tier: 1,
    requiredForms: ['blade'],
    description: 'Remove surface material with edge',
  },
  can_contain_liquid: {
    tier: 2,
    requiredForms: ['bowl'],
    description: 'Hold liquids without leaking',
  },
  can_contain_solid: {
    tier: 1,
    requiredForms: ['bowl', 'box', 'enclosure'],
    description: 'Hold solid objects within',
  },
  can_roll: {
    tier: 2,
    requiredForms: ['wheel', 'ball', 'tube'],
    description: 'Move by rotating along surface',
  },
  can_spin: {
    tier: 3,
    requiredForms: ['wheel', 'rod'],
    description: 'Rotate around central axis',
  },
  can_support_weight: {
    tier: 1,
    requiredForms: ['rod', 'sheet', 'frame', 'platform', 'saddle'],
    description: 'Bear load without collapsing',
  },
  can_float: {
    tier: 3,
    requiredForms: ['bowl', 'sheet'],
    description: 'Stay buoyant on water surface',
  },
  can_grip: {
    tier: 1,
    requiredForms: ['handle'],
    description: 'Allow secure hand hold',
  },
  can_bind: {
    tier: 1,
    requiredForms: ['cord'],
    description: 'Tie and secure objects together',
  },
  can_wrap: {
    tier: 1,
    requiredForms: ['sheet'],
    description: 'Enclose objects by folding around',
  },
  can_seal: {
    tier: 2,
    requiredForms: ['sheet', 'ring'],
    description: 'Close openings to prevent passage',
  },
  can_strike: {
    tier: 1,
    requiredForms: ['block'],
    description: 'Deliver impact force',
  },
  can_lever: {
    tier: 1,
    requiredForms: ['rod'],
    description: 'Apply mechanical advantage for lifting',
  },
  can_hook: {
    tier: 3,
    requiredForms: ['hook'],
    description: 'Catch and hold objects with curve',
  },
  can_wedge: {
    tier: 1,
    requiredForms: ['wedge'],
    description: 'Split apart or lift by insertion',
  },
  can_spring: {
    tier: 3,
    requiredForms: ['rod'],
    description: 'Store and release elastic energy',
  },
  can_conduct_heat: {
    tier: 3,
    requiredForms: ['rod', 'sheet'],
    description: 'Transfer thermal energy efficiently',
  },
  can_insulate: {
    tier: 1,
    requiredForms: ['sheet', 'mesh'],
    description: 'Resist heat transfer',
  },
  can_absorb: {
    tier: 2,
    requiredForms: ['mesh'],
    description: 'Soak up liquids or impacts',
  },
  can_reflect: {
    tier: 4,
    requiredForms: ['sheet'],
    description: 'Bounce back light or sound',
  },
  can_grind: {
    tier: 2,
    requiredForms: ['wheel', 'block'],
    description: 'Reduce to powder by friction',
  },

  // Additional Capabilities (12)
  can_dig: {
    tier: 1,
    requiredForms: ['wedge', 'blade'],
    description: 'Remove earth or material by scooping',
  },
  can_scoop: {
    tier: 1,
    requiredForms: ['bowl'],
    description: 'Lift loose material with concave form',
  },
  can_reach: {
    tier: 1,
    requiredForms: ['rod'],
    description: 'Extend to distant objects',
  },
  can_channel: {
    tier: 2,
    requiredForms: ['tube', 'trough'],
    description: 'Direct flow along a path',
  },
  can_pump: {
    tier: 3,
    requiredForms: ['bellows'],
    description: 'Move air or liquid by compression',
  },
  can_control_flow: {
    tier: 3,
    requiredForms: ['valve'],
    description: 'Regulate passage of fluids',
  },
  can_amplify_sound: {
    tier: 3,
    requiredForms: ['cone'],
    description: 'Increase sound volume by focusing waves',
  },
  can_thread: {
    tier: 3,
    requiredForms: ['helix'],
    description: 'Create helical pattern for fastening',
  },
  can_store_mechanical_energy: {
    tier: 3,
    requiredForms: ['helix'],
    description: 'Hold potential energy in coiled form',
  },
  can_mesh: {
    tier: 4,
    requiredForms: ['gear'],
    description: 'Interlock with matching teeth',
  },
  can_convert_motion: {
    tier: 4,
    requiredForms: ['cam', 'piston'],
    description: 'Transform between rotary and linear motion',
  },
  can_focus: {
    tier: 5,
    requiredForms: ['lens'],
    description: 'Concentrate light rays to a point',
  },
};

// ==========================================
// Functional Properties Registry (18 properties)
// Maps functional properties to their tier, category, and required capabilities
// ==========================================

export const FUNCTIONAL_PROPERTIES_REGISTRY: Record<FunctionalProperty, {
  tier: Tier;
  category: FunctionalCategory;
  requiredCapabilities: Capability[];
  description: string;
}> = {
  // Base Functional (12)
  mobile: {
    tier: 3,
    category: 'Mobility',
    requiredCapabilities: ['can_roll', 'can_support_weight'],
    description: 'Can move across terrain on wheels or rollers',
  },
  floating: {
    tier: 3,
    category: 'Mobility',
    requiredCapabilities: ['can_float', 'can_contain_solid'],
    description: 'Can travel on water while carrying cargo',
  },
  stable: {
    tier: 1,
    category: 'Crafting',
    requiredCapabilities: ['can_support_weight', 'can_bind'],
    description: 'Provides steady platform for work',
  },
  contained: {
    tier: 2,
    category: 'Hauling',
    requiredCapabilities: ['can_contain_solid', 'can_seal'],
    description: 'Protects contents from environment',
  },
  controlled: {
    tier: 4,
    category: 'Crafting',
    requiredCapabilities: ['can_grip', 'can_lever'],
    description: 'Allows precise manipulation of force',
  },
  cutting: {
    tier: 1,
    category: 'Crafting',
    requiredCapabilities: ['can_cut', 'can_grip'],
    description: 'Enables processing materials by cutting',
  },
  heated: {
    tier: 3,
    category: 'Nourishment',
    requiredCapabilities: ['can_conduct_heat', 'can_contain_solid'],
    description: 'Can cook or heat materials',
  },
  powered: {
    tier: 3,
    category: 'Crafting',
    requiredCapabilities: ['can_lever', 'can_spin'],
    description: 'Provides mechanical power for work',
  },
  flowing: {
    tier: 2,
    category: 'Nourishment',
    requiredCapabilities: ['can_channel', 'can_control_flow'],
    description: 'Controls water or liquid movement',
  },
  amplified: {
    tier: 4,
    category: 'Crafting',
    requiredCapabilities: ['can_lever', 'can_spring'],
    description: 'Multiplies force through mechanisms',
  },
  preserved: {
    tier: 2,
    category: 'Nourishment',
    requiredCapabilities: ['can_seal', 'can_insulate'],
    description: 'Keeps food fresh longer',
  },
  geared: {
    tier: 4,
    category: 'Crafting',
    requiredCapabilities: ['can_mesh', 'can_spin'],
    description: 'Transfers and converts rotational power',
  },

  // Talk Need Coverage (3)
  communicating_near: {
    tier: 3,
    category: 'Signaling',
    requiredCapabilities: ['can_amplify_sound'],
    description: 'Projects voice over distance',
  },
  signaling_visual: {
    tier: 3,
    category: 'Signaling',
    requiredCapabilities: ['can_reflect', 'can_grip'],
    description: 'Sends visual signals using light',
  },
  recorded: {
    tier: 2,
    category: 'Signaling',
    requiredCapabilities: ['can_cut', 'can_grip'],
    description: 'Creates permanent marks for information',
  },

  // Recover Need Coverage (3)
  resting: {
    tier: 1,
    category: 'Recovery',
    requiredCapabilities: ['can_support_weight', 'can_insulate'],
    description: 'Provides comfortable surface for rest',
  },
  healing: {
    tier: 2,
    category: 'Recovery',
    requiredCapabilities: ['can_contain_liquid', 'can_seal'],
    description: 'Stores and applies medicinal preparations',
  },
  sheltering: {
    tier: 1,
    category: 'Recovery',
    requiredCapabilities: ['can_wrap', 'can_support_weight'],
    description: 'Protects from weather and elements',
  },
};

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get all forms of a specific tier
 */
export function getFormsByTier(tier: Tier): Form[] {
  return (Object.entries(FORMS_REGISTRY) as [Form, typeof FORMS_REGISTRY[Form]][])
    .filter(([_, data]) => data.tier === tier)
    .map(([form]) => form);
}

/**
 * Get all capabilities of a specific tier
 */
export function getCapabilitiesByTier(tier: Tier): Capability[] {
  return (Object.entries(CAPABILITIES_REGISTRY) as [Capability, typeof CAPABILITIES_REGISTRY[Capability]][])
    .filter(([_, data]) => data.tier === tier)
    .map(([capability]) => capability);
}

/**
 * Get all functional properties of a specific tier
 */
export function getFunctionalPropertiesByTier(tier: Tier): FunctionalProperty[] {
  return (Object.entries(FUNCTIONAL_PROPERTIES_REGISTRY) as [FunctionalProperty, typeof FUNCTIONAL_PROPERTIES_REGISTRY[FunctionalProperty]][])
    .filter(([_, data]) => data.tier === tier)
    .map(([prop]) => prop);
}

/**
 * Get all functional properties by category
 */
export function getFunctionalPropertiesByCategory(category: FunctionalCategory): FunctionalProperty[] {
  return (Object.entries(FUNCTIONAL_PROPERTIES_REGISTRY) as [FunctionalProperty, typeof FUNCTIONAL_PROPERTIES_REGISTRY[FunctionalProperty]][])
    .filter(([_, data]) => data.category === category)
    .map(([prop]) => prop);
}

/**
 * Get forms that enable a specific capability
 */
export function getFormsForCapability(capability: Capability): Form[] {
  return CAPABILITIES_REGISTRY[capability].requiredForms;
}

/**
 * Get capabilities required for a functional property
 */
export function getCapabilitiesForFunctionalProperty(property: FunctionalProperty): Capability[] {
  return FUNCTIONAL_PROPERTIES_REGISTRY[property].requiredCapabilities;
}
