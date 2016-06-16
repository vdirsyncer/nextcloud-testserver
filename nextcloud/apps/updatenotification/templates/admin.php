<?php
	script('updatenotification', 'admin');

	/** @var array $_ */
	/** @var bool $isNewVersionAvailable */
	$isNewVersionAvailable = $_['isNewVersionAvailable'];
	/** @var string $newVersionString */
	$newVersionString = $_['newVersionString'];
	/** @var string $lastCheckedDate */
	$lastCheckedDate = $_['lastChecked'];
	/** @var array $channels */
	$channels = $_['channels'];
	/** @var string $currentChannel */
	$currentChannel = $_['currentChannel'];
	/** @var bool $updaterRequirementsFulfilled */
	$updaterRequirementsFulfilled = $_['updaterRequirementsFulfilled'];
?>
<form id="oca_updatenotification_section" class="section">
	<h2><?php p($l->t('Updater')); ?></h2>

	<?php if($isNewVersionAvailable === true): ?>
		<strong><?php p($l->t('A new version is available: %s', [$newVersionString])); ?></strong>
		<?php if($updaterRequirementsFulfilled === true): ?>
			<input type="button" id="oca_updatenotification_button" value="<?php p($l->t('Open updater')) ?>">
		<?php else: ?>
			<br/><?php p($l->t('At the moment only manual updates are supported on your environment. This is very likely the case because functions such as shell_exec are not available.')); ?>
		<?php endif; ?>
	<?php else: ?>
		<strong><?php print_unescaped($l->t('Your version is up to date.')); ?></strong>
		<span class="icon-info svg" title="<?php p($l->t('Checked on %s', [$lastCheckedDate])) ?>"></span>
	<?php endif; ?>

	<p>
		<label for="release-channel"><?php p($l->t('Update channel:')) ?></label>
		<select id="release-channel">
			<option value="<?php p($currentChannel); ?>"><?php p($currentChannel); ?></option>
			<?php foreach ($channels as $channel => $channelTitle){ ?>
				<option value="<?php p($channelTitle) ?>">
					<?php p($channelTitle) ?>
				</option>
			<?php } ?>
		</select>
		<span id="channel_save_msg"></span>
	</p>
	<p>
		<em><?php p($l->t('You can always update to a newer version / experimental channel. But you can never downgrade to a more stable channel.')); ?></em>
	</p>
</form>
