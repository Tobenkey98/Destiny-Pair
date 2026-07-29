import requests
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Denomination
from .serializers import DenominationSerializer
from .services import DenominationService

from django.conf import settings

from .models import Photo, CoverPhoto
from .serializers import PhotoSerializer, CoverPhotoSerializer


def check_ai_image(image_path):
    if not settings.SIGHTENGINE_ENABLED:
        return None
    try:
        resp = requests.post(
            'https://api.sightengine.com/1.0/check.json',
            params={
                'api_user': settings.SIGHTENGINE_API_USER,
                'api_secret': settings.SIGHTENGINE_API_SECRET,
                'models': 'ai_generated',
            },
            files={'media': open(image_path, 'rb')},
            timeout=30,
        )
        data = resp.json()
        if 'type' in data and data['type'].get('ai_generated'):
            return {
                'is_ai_generated': data['type']['ai_generated'],
                'confidence': data.get('ai_generated_probability', 0),
            }
    except Exception:
        pass
    return None


class PhotoUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('image')
        if not file:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

        max_size = 10 * 1024 * 1024
        if file.size > max_size:
            return Response({'error': 'Image too large (max 10MB)'}, status=status.HTTP_400_BAD_REQUEST)

        has_existing = Photo.objects.filter(user=request.user).exists()
        photo = Photo(user=request.user, image=file, is_primary=not has_existing)
        photo.save()

        ai_result = check_ai_image(photo.image.path)
        if ai_result:
            photo.is_ai_generated = ai_result['is_ai_generated']
            photo.ai_confidence = ai_result['confidence']
            photo.save(update_fields=['is_ai_generated', 'ai_confidence'])

        return Response(
            PhotoSerializer(photo, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class PhotoListView(generics.ListAPIView):
    serializer_class = PhotoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Photo.objects.filter(user=self.request.user)


class PhotoDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Photo.objects.filter(user=self.request.user)


class PrimaryPhotoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, photo_id):
        try:
            photo = Photo.objects.get(id=photo_id, user=request.user)
        except Photo.DoesNotExist:
            return Response({'error': 'Photo not found'}, status=status.HTTP_404_NOT_FOUND)

        Photo.objects.filter(user=request.user, is_primary=True).update(is_primary=False)
        photo.is_primary = True
        photo.save(update_fields=['is_primary'])
        return Response(PhotoSerializer(photo, context={'request': request}).data)


class CoverPhotoUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('image')
        if not file:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

        max_size = 10 * 1024 * 1024
        if file.size > max_size:
            return Response({'error': 'Image too large (max 10MB)'}, status=status.HTTP_400_BAD_REQUEST)

        CoverPhoto.objects.filter(user=request.user).delete()
        cover = CoverPhoto.objects.create(user=request.user, image=file)
        photo_url = request.build_absolute_uri(cover.image.url)
        return Response({'cover_photo': photo_url})


class DenominationListView(generics.ListAPIView):
    serializer_class = DenominationSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return DenominationService.get_approved()
