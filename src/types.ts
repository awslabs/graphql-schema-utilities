import {
  ASTVisitor,
  ValidationContext,
} from 'graphql';

/**
 * The Custom validation rules to validate the against merged schema and operation files.
 */
export type ValidationRule = (context: ValidationContext) => ASTVisitor;
