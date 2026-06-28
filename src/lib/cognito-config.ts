// Cognito User Pool - Phase 4 (HisAuthStack, us-east-1)
// UserPoolId and UserPoolClientId are public identifiers — not credentials.
// Phase 6 (auth-service Lambda) wires signIn/forgotPassword calls using these values.
export const cognitoConfig = {
  region:         'us-east-1',
  userPoolId:     'us-east-1_sg12WSi27',
  userPoolClientId: '6p7d2strpa32pj5883h4taqvc2',
} as const;
