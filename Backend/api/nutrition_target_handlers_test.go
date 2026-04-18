package api_test

import (
	"net/http"
	"testing"
	"time"

	"fitness-tracker/models"
	"fitness-tracker/services"
)

func TestGetUserNutritionTargets(t *testing.T) {
	t.Parallel()

	db, server := newTestApp(t)

	// Create user via register
	auth := registerTestUser(t, server, "targets@example.com", "Target User", "password123")
	user := auth.User

	// Update user with specific metrics needed for calculation
	dob := time.Now().AddDate(-30, 0, 0)
	db.Model(&models.User{}).Where("id = ?", user.ID).Updates(models.User{
		DateOfBirth:   &dob,
		Weight:        80,
		Height:        180,
		Goal:          "build_muscle",
		ActivityLevel: "active",
	})

	t.Run("Valid Request Target User", func(t *testing.T) {
		targets := requestJSONAuth[services.NutritionTargets](t, server, auth.AccessToken, http.MethodGet, "/v1/users/"+user.ID.String()+"/nutrition-targets", nil, http.StatusOK)

		if targets.Calories <= 0 {
			t.Fatalf("expected calculated calories > 0, got %d", targets.Calories)
		}
		if targets.Goal != "build_muscle" {
			t.Fatalf("expected goal build_muscle, got %s", targets.Goal)
		}
		if targets.IsOverride {
			t.Fatalf("expected IsOverride false")
		}
		if targets.ActivityLevel != "active" {
			t.Fatalf("expected activity_level active, got %s", targets.ActivityLevel)
		}
	})

	t.Run("TDEE Override", func(t *testing.T) {
		overrideAuth := registerTestUser(t, server, "override@example.com", "Override User", "password123")

		db.Model(&models.User{}).Where("id = ?", overrideAuth.User.ID).Updates(models.User{
			DateOfBirth:   &dob,
			Weight:        80,
			Height:        180,
			TDEE:          3000,
			Goal:          "lose_fat",
			ActivityLevel: "active",
		})

		targets := requestJSONAuth[services.NutritionTargets](t, server, overrideAuth.AccessToken, http.MethodGet, "/v1/users/"+overrideAuth.User.ID.String()+"/nutrition-targets", nil, http.StatusOK)

		if targets.Calories != 3000 {
			t.Fatalf("expected overridden calories 3000, got %d", targets.Calories)
		}
		if !targets.IsOverride {
			t.Fatalf("expected IsOverride true")
		}
	})

	t.Run("Goal Update Preserves Explicit TDEE Override", func(t *testing.T) {
		goalAuth := registerTestUser(t, server, "goal-update@example.com", "Goal Update User", "password123")

		db.Model(&models.User{}).Where("id = ?", goalAuth.User.ID).Updates(models.User{
			DateOfBirth:   &dob,
			Weight:        80,
			Height:        180,
			TDEE:          2600,
			Goal:          "maintain",
			ActivityLevel: "active",
		})

		updated := requestJSONAuth[models.User](t, server, goalAuth.AccessToken, http.MethodPatch, "/v1/users/"+goalAuth.User.ID.String(), map[string]any{
			"goal": "lose_fat",
		}, http.StatusOK)

		if updated.TDEE != 2600 {
			t.Fatalf("expected explicit tdee override 2600 to be preserved, got %d", updated.TDEE)
		}

		targets := requestJSONAuth[services.NutritionTargets](t, server, goalAuth.AccessToken, http.MethodGet, "/v1/users/"+goalAuth.User.ID.String()+"/nutrition-targets", nil, http.StatusOK)
		if targets.Calories != updated.TDEE {
			t.Fatalf("expected nutrition target calories %d to match persisted tdee %d", targets.Calories, updated.TDEE)
		}
		if !targets.IsOverride {
			t.Fatalf("expected preserved tdee to remain an override")
		}
	})

	t.Run("Patch Activity Level Alias Persists Canonical Value", func(t *testing.T) {
		aliasAuth := registerTestUser(t, server, "alias@example.com", "Alias User", "password123")

		db.Model(&models.User{}).Where("id = ?", aliasAuth.User.ID).Updates(models.User{
			DateOfBirth:   &dob,
			Weight:        80,
			Height:        180,
			TDEE:          0,
			Goal:          "maintain",
			ActivityLevel: "sedentary",
		})

		updated := requestJSONAuth[models.User](t, server, aliasAuth.AccessToken, http.MethodPatch, "/v1/users/"+aliasAuth.User.ID.String(), map[string]any{
			"activity_level": "light",
		}, http.StatusOK)

		if updated.ActivityLevel != "lightly_active" {
			t.Fatalf("expected canonical activity_level lightly_active, got %q", updated.ActivityLevel)
		}

		targets := requestJSONAuth[services.NutritionTargets](t, server, aliasAuth.AccessToken, http.MethodGet, "/v1/users/"+aliasAuth.User.ID.String()+"/nutrition-targets", nil, http.StatusOK)
		if targets.ActivityLevel != "lightly_active" {
			t.Fatalf("expected nutrition targets activity_level lightly_active, got %q", targets.ActivityLevel)
		}
		if targets.IsOverride {
			t.Fatalf("expected alias update without tdee to remain non-override")
		}
	})

	t.Run("Nutrition Targets Accept Legacy Activity Aliases", func(t *testing.T) {
		legacyAliasAuth := registerTestUser(t, server, "legacy-alias@example.com", "Legacy Alias User", "password123")

		db.Model(&models.User{}).Where("id = ?", legacyAliasAuth.User.ID).Updates(models.User{
			DateOfBirth:   &dob,
			Weight:        80,
			Height:        180,
			TDEE:          0,
			Goal:          "maintain",
			ActivityLevel: "moderate",
		})

		targets := requestJSONAuth[services.NutritionTargets](t, server, legacyAliasAuth.AccessToken, http.MethodGet, "/v1/users/"+legacyAliasAuth.User.ID.String()+"/nutrition-targets", nil, http.StatusOK)
		if targets.ActivityLevel != "moderately_active" {
			t.Fatalf("expected legacy alias to normalize to moderately_active, got %q", targets.ActivityLevel)
		}
	})

	t.Run("Unauthorized cross-user access", func(t *testing.T) {
		otherAuth := registerTestUser(t, server, "other@example.com", "Other User", "password123")

		expectStatusAuth(t, server, auth.AccessToken, http.MethodGet, "/v1/users/"+otherAuth.User.ID.String()+"/nutrition-targets", nil, http.StatusForbidden)
	})
}
