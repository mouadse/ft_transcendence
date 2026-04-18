package api_test

import (
	"net/http"
	"testing"

	"fitness-tracker/models"
)

func TestFoodListScopesUsageMetadataToAdminRoute(t *testing.T) {
	t.Parallel()

	db, handler := newTestApp(t)

	userAuth := registerTestUser(t, handler, "foods-user@example.com", "Foods User", "password123")
	adminAuth := registerTestUser(t, handler, "foods-admin@example.com", "Foods Admin", "password123")
	if err := db.Model(&models.User{}).Where("id = ?", adminAuth.User.ID).Update("role", "admin").Error; err != nil {
		t.Fatalf("promote admin: %v", err)
	}

	food := requestJSONAuth[models.Food](t, handler, userAuth.AccessToken, http.MethodPost, "/v1/foods", map[string]any{
		"name":          "Chicken Breast",
		"serving_size":  100,
		"serving_unit":  "g",
		"calories":      165,
		"protein":       31,
		"carbohydrates": 0,
		"fat":           3.6,
	}, http.StatusCreated)

	meal := requestJSONAuth[models.Meal](t, handler, userAuth.AccessToken, http.MethodPost, "/v1/meals", map[string]any{
		"user_id":   userAuth.User.ID,
		"meal_type": "lunch",
		"date":      "2026-04-18",
	}, http.StatusCreated)

	requestJSONAuth[models.MealFood](t, handler, userAuth.AccessToken, http.MethodPost, "/v1/meals/"+meal.ID.String()+"/foods", map[string]any{
		"food_id":  food.ID,
		"quantity": 1,
	}, http.StatusCreated)

	publicList := requestJSON[struct {
		Data []map[string]any `json:"data"`
	}](t, handler, http.MethodGet, "/v1/foods", nil, http.StatusOK)
	if len(publicList.Data) != 1 {
		t.Fatalf("expected one public food, got %d", len(publicList.Data))
	}
	if _, ok := publicList.Data[0]["meal_usage_count"]; ok {
		t.Fatalf("public /v1/foods should not expose meal_usage_count")
	}
	if _, ok := publicList.Data[0]["can_delete"]; ok {
		t.Fatalf("public /v1/foods should not expose can_delete")
	}

	requestErrorAuth(t, handler, userAuth.AccessToken, http.MethodGet, "/v1/admin/foods", nil, http.StatusForbidden)

	adminList := requestJSONAuth[struct {
		Data []map[string]any `json:"data"`
	}](t, handler, adminAuth.AccessToken, http.MethodGet, "/v1/admin/foods", nil, http.StatusOK)
	if len(adminList.Data) != 1 {
		t.Fatalf("expected one admin food, got %d", len(adminList.Data))
	}
	if got := adminList.Data[0]["meal_usage_count"]; got != float64(1) {
		t.Fatalf("expected meal_usage_count 1, got %#v", got)
	}
	if got := adminList.Data[0]["can_delete"]; got != false {
		t.Fatalf("expected can_delete false, got %#v", got)
	}
}
