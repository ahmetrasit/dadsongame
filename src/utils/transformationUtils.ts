import type { MaterialTransformation, ResourceDefinition, TransformationRequirement } from '@/stores/definitions/resourcesStore';
import type { ToolFunctionAllocation } from '@/types/tools';

export interface AvailableTransformation {
  transformation: MaterialTransformation;
  canPerform: boolean;
  missingRequirements: string[];
}

// Check if a single requirement is met
export function checkRequirement(
  req: TransformationRequirement,
  toolStats: Partial<ToolFunctionAllocation> | null,
  nearbyHeat: number
): { met: boolean; reason?: string } {
  // Environment requirements
  if (req.property === 'heat') {
    if (nearbyHeat >= req.min && (req.max === undefined || nearbyHeat <= req.max)) {
      return { met: true };
    }
    return { met: false, reason: `Need heat ${req.min}${req.max ? `-${req.max}` : '+'}` };
  }

  // Tool requirements
  if (toolStats) {
    const toolValue = toolStats[req.property as keyof ToolFunctionAllocation] || 0;
    if (toolValue >= req.min && (req.max === undefined || toolValue <= req.max)) {
      return { met: true };
    }
    return { met: false, reason: `Need ${req.property} ${req.min}${req.max ? `-${req.max}` : '+'}` };
  }

  return { met: false, reason: `No tool with ${req.property}` };
}

// Get available transformations for a resource
export function getAvailableTransformations(
  resource: ResourceDefinition,
  toolStats: Partial<ToolFunctionAllocation> | null,
  nearbyHeat: number = 0
): AvailableTransformation[] {
  if (!resource.transformations || resource.transformations.length === 0) {
    return [];
  }

  return resource.transformations.map(transformation => {
    const missingRequirements: string[] = [];
    let canPerform = true;

    // No requirements = by hand, always available
    if (transformation.requirements.length === 0) {
      return { transformation, canPerform: true, missingRequirements: [] };
    }

    // Check each requirement
    for (const req of transformation.requirements) {
      const result = checkRequirement(req, toolStats, nearbyHeat);
      if (!result.met) {
        canPerform = false;
        if (result.reason) missingRequirements.push(result.reason);
      }
    }

    return { transformation, canPerform, missingRequirements };
  });
}
