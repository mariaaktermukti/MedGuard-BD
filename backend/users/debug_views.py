from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class DebugAuthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "username": request.user.username,
            "is_authenticated": request.user.is_authenticated,
            "role": getattr(request.user, 'role', 'NO_ROLE')
        })
