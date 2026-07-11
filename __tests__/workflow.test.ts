// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { WORKFLOW_CONFIG } from '../constants';
import { OrderType, OrderStatus } from '../types';

describe('Workflow Config Validation', () => {
  it('should have correct transitions for SHOPPING orders', () => {
    const shoppingWorkflow = WORKFLOW_CONFIG[OrderType.SHOPPING];
    
    // First step
    expect(shoppingWorkflow[OrderStatus.ACCEPTED].next).toBe(OrderStatus.PICKED_UP);
    expect(shoppingWorkflow[OrderStatus.ACCEPTED].requireProof).toBe(false);
    
    // Second step
    expect(shoppingWorkflow[OrderStatus.PICKED_UP].next).toBe(OrderStatus.ON_THE_WAY);
    
    // Final step
    expect(shoppingWorkflow[OrderStatus.ON_THE_WAY].next).toBe(OrderStatus.DELIVERED);
    expect(shoppingWorkflow[OrderStatus.ON_THE_WAY].requireProof).toBe(true);
  });

  it('should have correct transitions for EMERGENCY orders', () => {
    const emergencyWorkflow = WORKFLOW_CONFIG[OrderType.EMERGENCY];
    
    expect(emergencyWorkflow[OrderStatus.ACCEPTED].next).toBe(OrderStatus.ON_THE_WAY);
    expect(emergencyWorkflow[OrderStatus.ON_THE_WAY].next).toBe(OrderStatus.DELIVERED);
    expect(emergencyWorkflow[OrderStatus.ON_THE_WAY].requireProof).toBe(true);
  });
});
