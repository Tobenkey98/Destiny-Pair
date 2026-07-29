from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import Token
from rest_framework.exceptions import AuthenticationFailed


class CustomJWTAuthentication(JWTAuthentication):
    """JWT auth that also enforces a per-user security stamp.

    The stamp is embedded in every issued token. If the user's stamp in the
    database no longer matches the token's stamp (e.g. after a role change or
    deactivation), the token is rejected — effectively revoking access.
    """

    def get_user(self, validated_token: Token):
        user = super().get_user(validated_token)

        if not user.is_active:
            raise AuthenticationFailed('User account is inactive.')

        # Tokens issued before stamping existed have no claim; allow them through
        # so we don't log everyone out, but every newly issued token is checked.
        if 'stamp' not in validated_token:
            return user

        token_stamp = validated_token['stamp']
        if not token_stamp or token_stamp != user.security_stamp:
            raise AuthenticationFailed('Credentials are no longer valid.')

        return user
