from rest_framework import generics, permissions

from counselling.models import CounsellingSession
from counselling.serializers import CounsellingSessionSerializer


class CounsellingSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = CounsellingSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CounsellingSession.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
