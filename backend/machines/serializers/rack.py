from rest_framework import serializers

# Deprecated: Rack model removed
class RackSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
