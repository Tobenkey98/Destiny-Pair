from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model

from matching.services.filter_engine import get_qualified_candidates
from matching.services.compatibility_engine import compute_compatibility
from matching.services.ranking_engine import rank_candidates
from matching.services.recommendation_engine import get_personalized_recommendations
from matching.models import ProfileView, SavedProfile
from .serializers import CandidateSerializer, MatchScoreSerializer, RecommendationSerializer

User = get_user_model()


class MatchListView(APIView):
    """
    GET /api/matches/
    Returns ranked compatible matches with compatibility scores.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        candidates = get_qualified_candidates(user)
        ranked = rank_candidates(user, candidates)

        results = []
        for item in ranked[:50]:
            candidate = item.pop('user')
            candidate_data = CandidateSerializer(
                candidate, context={'request': request}
            ).data
            results.append({**item, 'user': candidate_data})

        return Response(results)


class MatchScoreView(APIView):
    """
    GET /api/match-score/<profile_id>/
    Returns detailed compatibility breakdown with a specific user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, profile_id):
        try:
            other = User.objects.get(id=profile_id, is_verified=True, is_banned=False, is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        score = compute_compatibility(request.user, other)
        return Response(score)


class ProfileSuggestionView(APIView):
    """
    GET /api/profile-suggestions/
    Returns behaviour-based suggestions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        candidates = get_qualified_candidates(user)
        recommendations = get_personalized_recommendations(user, candidates)

        results = []
        for item in recommendations[:20]:
            candidate = item.pop('user')
            candidate_data = CandidateSerializer(
                candidate, context={'request': request}
            ).data
            results.append({**item, 'user': candidate_data})

        return Response(results)


class RecommendationView(APIView):
    """
    GET /api/recommendations/
    Returns personalized recommendations with categories.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        candidates = get_qualified_candidates(user)
        recommendations = get_personalized_recommendations(user, candidates)

        most_compatible = []
        recently_active = []
        near_preference = []
        popular = []

        for item in recommendations:
            candidate = item.pop('user')
            candidate_data = CandidateSerializer(
                candidate, context={'request': request}
            ).data
            entry = {**item, 'user': candidate_data}

            if item['recommendation_level'] in ('Excellent Match', 'Strong Match'):
                most_compatible.append(entry)
            if candidate.last_login and candidate.last_login > __import__('django').utils.timezone.now() - __import__('datetime').timedelta(days=7):
                recently_active.append(entry)
            if candidate.city_state and candidate.city_state.lower() == (user.city_state or '').lower():
                near_preference.append(entry)

        popular = sorted(recommendations, key=lambda x: ProfileView.objects.filter(viewed=x.get('user', request.user)).count(), reverse=True)[:10]
        popular_results = []
        for item in popular:
            candidate = item.get('user', request.user)
            if hasattr(candidate, 'id') and candidate.id != user.id:
                candidate_data = CandidateSerializer(
                    candidate, context={'request': request}
                ).data
                entry = {**item, 'user': candidate_data}
                popular_results.append(entry)

        return Response({
            'most_compatible': most_compatible[:10],
            'recently_active': recently_active[:10],
            'near_your_preference': near_preference[:10],
            'popular_this_week': popular_results[:10],
        })


class ProfileTrackView(APIView):
    """
    POST /api/track-profile-view/
    Records that the authenticated user viewed a profile.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        viewed_id = request.data.get('viewed_id')
        if not viewed_id:
            return Response({'error': 'viewed_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            viewed = User.objects.get(id=viewed_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if viewed.id == request.user.id:
            return Response({'error': 'Cannot track your own profile'}, status=status.HTTP_400_BAD_REQUEST)

        ProfileView.objects.create(viewer=request.user, viewed=viewed)
        return Response({'status': 'tracked'})


class SaveProfileView(APIView):
    """
    POST /api/save-profile/
    Saves a profile for later review.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        saved_id = request.data.get('saved_id')
        if not saved_id:
            return Response({'error': 'saved_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            saved = User.objects.get(id=saved_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if saved.id == request.user.id:
            return Response({'error': 'Cannot save your own profile'}, status=status.HTTP_400_BAD_REQUEST)

        _, created = SavedProfile.objects.get_or_create(saver=request.user, saved=saved)
        if created:
            return Response({'status': 'saved'})
        return Response({'status': 'already_saved'})
