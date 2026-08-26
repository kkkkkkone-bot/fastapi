package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func resetModelMetadataTestTables(t *testing.T) {
	t.Helper()
	require.NoError(t, DB.AutoMigrate(&Channel{}, &Ability{}, &Model{}))
	for _, table := range []string{"abilities", "channels", "models"} {
		require.NoError(t, DB.Exec("DELETE FROM "+table).Error)
	}
	t.Cleanup(func() {
		for _, table := range []string{"abilities", "channels", "models"} {
			require.NoError(t, DB.Exec("DELETE FROM "+table).Error)
		}
	})
}

func TestEnsureModelMetadataCreatesOnlyMissingExactModels(t *testing.T) {
	resetModelMetadataTestTables(t)

	existing := &Model{
		ModelName:    "existing-model",
		Description:  "keep this description",
		Status:       0,
		SyncOfficial: 0,
	}
	require.NoError(t, existing.Insert())

	require.NoError(t, EnsureModelMetadata(DB, []string{
		"existing-model",
		" new-model ",
		"new-model",
		"",
	}))

	var models []Model
	require.NoError(t, DB.Order("model_name ASC").Find(&models).Error)
	require.Len(t, models, 2)
	assert.Equal(t, "existing-model", models[0].ModelName)
	assert.Equal(t, "keep this description", models[0].Description)
	assert.Equal(t, 0, models[0].Status)
	assert.Equal(t, 0, models[0].SyncOfficial)
	assert.Equal(t, "new-model", models[1].ModelName)
	assert.Equal(t, 1, models[1].Status)
	assert.Equal(t, 1, models[1].SyncOfficial)
}

func TestChannelAbilityUpdatesCreateMetadataWithoutChangingPrice(t *testing.T) {
	resetModelMetadataTestTables(t)

	originalPrices := ratio_setting.ModelPrice2JSONString()
	require.NoError(t, ratio_setting.UpdateModelPriceByJSONString(`{"priced-model":0.42}`))
	t.Cleanup(func() {
		require.NoError(t, ratio_setting.UpdateModelPriceByJSONString(originalPrices))
	})

	channel := &Channel{
		Name:   "metadata-channel",
		Key:    "test-key",
		Status: common.ChannelStatusEnabled,
		Group:  "default",
		Models: "priced-model,plain-model",
	}
	require.NoError(t, channel.Insert())

	var modelNames []string
	require.NoError(t, DB.Model(&Model{}).Order("model_name ASC").Pluck("model_name", &modelNames).Error)
	assert.Equal(t, []string{"plain-model", "priced-model"}, modelNames)
	price, ok := ratio_setting.GetModelPrice("priced-model", false)
	require.True(t, ok)
	assert.InDelta(t, 0.42, price, 0.000001)

	channel.Models = "priced-model,plain-model,pulled-model"
	require.NoError(t, channel.UpdateAbilities(nil))
	require.NoError(t, channel.UpdateAbilities(nil))

	modelNames = nil
	require.NoError(t, DB.Model(&Model{}).Order("model_name ASC").Pluck("model_name", &modelNames).Error)
	assert.Equal(t, []string{"plain-model", "priced-model", "pulled-model"}, modelNames)
	price, ok = ratio_setting.GetModelPrice("priced-model", false)
	require.True(t, ok)
	assert.InDelta(t, 0.42, price, 0.000001)
}

func TestEnsureChannelModelMetadataBackfillsExistingChannels(t *testing.T) {
	resetModelMetadataTestTables(t)

	require.NoError(t, DB.Create(&Channel{
		Name:   "existing-channel",
		Key:    "test-key",
		Status: common.ChannelStatusEnabled,
		Group:  "default",
		Models: "existing-one, existing-two",
	}).Error)

	require.NoError(t, EnsureChannelModelMetadata(DB))

	var modelNames []string
	require.NoError(t, DB.Model(&Model{}).Order("model_name ASC").Pluck("model_name", &modelNames).Error)
	assert.Equal(t, []string{"existing-one", "existing-two"}, modelNames)
}
